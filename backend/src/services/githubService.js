import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Project from '../models/Project.js';
import eventBus from '../events/eventBus.js';

class GitHubService {
  constructor() {
    this.webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || '';
    this.githubToken = process.env.GITHUB_TOKEN || '';
    this.githubAppId = process.env.GITHUB_APP_ID || '';
    this.privateKeyPath = process.env.GITHUB_PRIVATE_KEY_PATH || '';
    this.privateKey = null;
    this.installationTokenCache = new Map();
  }

  verifyWebhookSignature(headers, rawBody) {
    if (!this.webhookSecret) {
      return true;
    }
    const signature = headers['x-hub-signature-256'] || headers['X-Hub-Signature-256'];
    if (!signature || !rawBody) return false;
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(rawBody);
    const digest = `sha256=${hmac.digest('hex')}`;
    try {
      return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async handlePushEvent(payload) {
    const owner = payload?.repository?.owner?.login || payload?.repository?.owner?.name;
    const repo = payload?.repository?.name;
    if (!owner || !repo) return;

    const project = await Project.findOne({ 'github.repoOwner': owner, 'github.repoName': repo });
    if (!project) return;

    const commits = payload.commits || [];
    for (const commit of commits) {
      await this.linkCommitToTasks(project, commit, owner, repo);
    }

    const actor = payload.pusher?.name || commits[0]?.author?.name || 'unknown';
    const summaries = commits.map(c => ({ sha: c.id?.slice(0,7) || '', message: c.message }));
    project.githubActivity = project.githubActivity || [];
    project.githubActivity.push({
      type: 'push',
      actor,
      action: 'pushed',
      ref: payload.ref || '',
      commitCount: commits.length,
      commits: summaries,
      date: new Date()
    });
    await project.save();
  }

  githubHeaders() {
    const headers = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'NexusApp'
    };
    if (this.githubToken) {
      headers['Authorization'] = `Bearer ${this.githubToken}`;
    }
    return headers;
  }

  async fetchJson(url) {
    const res = await fetch(url, {
      headers: this.githubHeaders()
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GitHub API ${res.status}: ${text || url}`);
    }
    return res.json();
  }

  base64url(input) {
    return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  loadPrivateKey() {
    if (this.privateKey) return this.privateKey;
    if (process.env.GITHUB_PRIVATE_KEY && process.env.GITHUB_PRIVATE_KEY.trim().length > 0) {
      this.privateKey = process.env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n');
      return this.privateKey;
    }
    const candidates = [];
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    if (this.privateKeyPath) {
      candidates.push(this.privateKeyPath);
      candidates.push(path.resolve(process.cwd(), this.privateKeyPath));
      candidates.push(path.resolve(__dirname, '../../', this.privateKeyPath));
    }
    // Also try default location if env var not provided
    candidates.push(path.resolve(process.cwd(), 'config/github-private-key.pem'));
    candidates.push(path.resolve(__dirname, '../../config/github-private-key.pem'));
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) {
          this.privateKey = fs.readFileSync(p, 'utf8');
          return this.privateKey;
        }
      } catch {
      }
    }
    return null;
  }

  debugPrivateKeyCandidates() {
    const candidates = [];
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    if (this.privateKeyPath) {
      candidates.push(this.privateKeyPath);
      candidates.push(path.resolve(process.cwd(), this.privateKeyPath));
      candidates.push(path.resolve(__dirname, '../../', this.privateKeyPath));
    }
    candidates.push(path.resolve(process.cwd(), 'config/github-private-key.pem'));
    candidates.push(path.resolve(__dirname, '../../config/github-private-key.pem'));
    const exists = candidates.map(p => ({ path: p, exists: fs.existsSync(p) }));
    return { candidates: exists, cwd: process.cwd() };
  }

  appJwt() {
    if (!this.githubAppId) return null;
    const key = this.loadPrivateKey();
    if (!key) return null;
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = { iat: now - 60, exp: now + 600, iss: this.githubAppId };
    const encodedHeader = this.base64url(JSON.stringify(header));
    const encodedPayload = this.base64url(JSON.stringify(payload));
    const data = `${encodedHeader}.${encodedPayload}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(data);
    const signature = signer.sign(key, 'base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${data}.${signature}`;
  }

  async installationToken(installationId) {
    if (!installationId) return null;
    const cached = this.installationTokenCache.get(installationId);
    if (cached && cached.expiresAt && cached.expiresAt > Date.now() + 60000) {
      return cached.token;
    }
    const jwt = this.appJwt();
    if (!jwt) return null;
    const url = `https://api.github.com/app/installations/${encodeURIComponent(installationId)}/access_tokens`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${jwt}`,
        'User-Agent': 'NexusApp'
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const token = data.token;
    const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : Date.now() + 3_000_000;
    if (token) {
      this.installationTokenCache.set(installationId, { token, expiresAt });
      return token;
    }
    return null;
  }

  async githubHeadersForProject(project) {
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'NexusApp'
    };
    const installationId = project?.github?.installationId;
    if (installationId) {
      const token = await this.installationToken(installationId);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        return headers;
      }
    }
    if (this.githubToken) {
      headers['Authorization'] = `Bearer ${this.githubToken}`;
    }
    return headers;
  }

  async fetchJsonForProject(url, project) {
    const res = await fetch(url, {
      headers: await this.githubHeadersForProject(project)
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GitHub API ${res.status}: ${text || url}`);
    }
    return res.json();
  }

  async installationHeaders(installationId) {
    const token = await this.installationToken(installationId);
    if (!token) return null;
    return {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'NexusApp'
    };
  }

  async listInstallationRepositories(installationId, withDebug = false) {
    const debug = {
      privateKeyLoaded: Boolean(this.loadPrivateKey()),
      appIdPresent: Boolean(this.githubAppId),
      appJwtCreated: false,
      tokenStatus: null,
      tokenObtained: false,
      reposStatus: null,
      reposCount: 0,
      accountStatus: null,
      message: null
    };
    if (withDebug) {
      debug.keyPath = this.privateKeyPath || null;
      debug.keyCandidates = this.debugPrivateKeyCandidates();
      debug.envAppId = Boolean(process.env.GITHUB_APP_ID);
    }
    let token = null;
    try {
      const jwt = this.appJwt();
      debug.appJwtCreated = Boolean(jwt);
      if (!jwt) {
        debug.message = 'Missing app JWT (check App ID/private key)';
      } else {
        const tRes = await fetch(`https://api.github.com/app/installations/${encodeURIComponent(installationId)}/access_tokens`, {
          method: 'POST',
          headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${jwt}`, 'User-Agent': 'NexusApp' }
        });
        debug.tokenStatus = tRes.status;
        if (tRes.ok) {
          const tData = await tRes.json();
          token = tData?.token || null;
          debug.tokenObtained = Boolean(token);
        } else {
          const tErr = await tRes.text().catch(() => '');
          debug.message = `Token exchange failed: ${tRes.status} ${tErr}`;
        }
      }
    } catch (e) {
      debug.message = 'Exception during token exchange';
    }
    if (!token) {
      if (withDebug) return { repos: [], account: null, debug };
      return { repos: [], account: null };
    }
    const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'User-Agent': 'NexusApp' };
    const url = 'https://api.github.com/installation/repositories?per_page=100';
    const res = await fetch(url, { headers });
    debug.reposStatus = res.status;
    if (!res.ok) {
      if (withDebug) return { repos: [], account: null, debug };
      return { repos: [], account: null };
    }
    const data = await res.json();
    const repos = Array.isArray(data.repositories)
      ? data.repositories.map(r => ({
          owner: r?.owner?.login || '',
          name: r?.name || '',
          full_name: r?.full_name || ''
        })).filter(r => r.owner && r.name)
      : [];
    debug.reposCount = repos.length;
    // Try to also fetch account login using app JWT
    let account = null;
    try {
      const jwt = this.appJwt();
      if (jwt) {
        const aiRes = await fetch(`https://api.github.com/app/installations/${encodeURIComponent(installationId)}`, {
          headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${jwt}`, 'User-Agent': 'NexusApp' }
        });
        debug.accountStatus = aiRes.status;
        if (aiRes.ok) {
          const ai = await aiRes.json();
          account = ai?.account?.login || null;
        }
      }
    } catch {
    }
    if (withDebug) return { repos, account, debug };
    return { repos, account };
  }

  normalizeTaskId(id) {
    return (id || '').toUpperCase().replace(/^TASK-0*/, 'TASK-');
  }

  extractTaskIdsFromMessage(message) {
    if (!message) return [];
    const matches = message.toUpperCase().match(/TASK-\d+/g) || [];
    return [...new Set(matches.map(m => m))];
  }

  async linkCommitToTasks(project, commit, owner, repo) {
    const msg = commit.message || commit.commit?.message || '';
    const taskIds = this.extractTaskIdsFromMessage(msg);
    if (taskIds.length === 0) return;
    const sha = commit.id || commit.sha || '';
    const shortSha = sha.slice(0, 7) || '';
    const commitUrl = `https://github.com/${owner}/${repo}/commit/${sha}`;
    const authorName = commit.author?.name || commit.commit?.author?.name || commit.committer?.name || 'unknown';
    const when = commit.timestamp || commit.commit?.author?.date || commit.commit?.committer?.date || new Date().toISOString();
    const commitInfo = {
      sha,
      message: msg,
      author: authorName,
      url: commitUrl,
      date: when ? new Date(when) : new Date()
    };

    for (const ref of taskIds) {
      const normalizedRef = this.normalizeTaskId(ref);
      const task = (project.tasks || []).find(t => this.normalizeTaskId(t.id) === normalizedRef);
      if (!task) continue;

      if (!Array.isArray(task.commits)) task.commits = [];
      task.commits.push(commitInfo);

      if (!Array.isArray(task.updates)) task.updates = [];
      task.updates.push({
        author: commitInfo.author,
        content: `Linked commit ${shortSha}: ${commit.message} (${commitUrl})`,
        date: commitInfo.date
      });

      if (task.status !== 'done' && task.status !== 'review' && task.status !== 'in-progress') {
        const previousStatus = task.status;
        task.status = 'in-progress';
        eventBus.emit('task.updated', {
          project,
          task,
          updater: commitInfo.author,
          changes: { Status: `${previousStatus} → in-progress` }
        });
      }
    }
  }

  async handlePullRequestEvent(payload) {
    const owner = payload?.repository?.owner?.login || payload?.repository?.owner?.name;
    const repo = payload?.repository?.name;
    if (!owner || !repo) return;

    const project = await Project.findOne({ 'github.repoOwner': owner, 'github.repoName': repo });
    if (!project) return;

    const pr = payload.pull_request;
    const action = payload.action;
    const actor = payload.sender?.login || 'unknown';
    project.githubActivity = project.githubActivity || [];
    project.githubActivity.push({
      type: 'pull_request',
      actor,
      action,
      ref: pr?.head?.ref || '',
      prNumber: pr?.number,
      merged: pr?.merged || false,
      commitCount: pr?.commits || undefined,
      commits: [],
      date: new Date()
    });
    await project.save();
  }

  async fetchAndStoreCommits(project) {
    const owner = project?.github?.repoOwner;
    const repo = project?.github?.repoName;
    if (!owner || !repo) return;
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=20`;
    const commits = await this.fetchJsonForProject(url, project);
    const existing = Array.isArray(project.githubActivity) ? project.githubActivity : [];
    for (const c of commits) {
      try {
        await this.linkCommitToTasks(project, c, owner, repo);
        const sha = c.sha || '';
        const actor = c.author?.login || c.commit?.author?.name || 'unknown';
        const message = c.commit?.message || '';
        const date = c.commit?.author?.date || c.commit?.committer?.date || new Date().toISOString();
        const already = existing.some(e => e.type === 'push' && Array.isArray(e.commits) && e.commits.some(k => (k.sha || '').toLowerCase().startsWith(sha.slice(0,7).toLowerCase())));
        if (already) continue;
        const entry = {
          type: 'push',
          actor,
          action: 'pushed',
          ref: '',
          commitCount: 1,
          commits: [{ sha: sha.slice(0,7), message }],
          date: new Date(date)
        };
        project.githubActivity = Array.isArray(project.githubActivity) ? project.githubActivity : [];
        project.githubActivity.push(entry);
      } catch {
      }
    }
    await project.save();
  }

  async fetchAndStorePulls(project) {
    const owner = project?.github?.repoOwner;
    const repo = project?.github?.repoName;
    if (!owner || !repo) return;
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=all&per_page=20`;
    const pulls = await this.fetchJsonForProject(url, project);
    project.githubActivity = Array.isArray(project.githubActivity) ? project.githubActivity : [];
    for (const pr of pulls) {
      try {
        const actor = pr.user?.login || 'unknown';
        const merged = Boolean(pr.merged_at);
        const action = merged ? 'merged' : pr.state;
        const keyExists = project.githubActivity.some(e =>
          e.type === 'pull_request' &&
          e.prNumber === pr.number &&
          e.action === action &&
          Boolean(e.merged) === merged
        );
        if (keyExists) continue;
        const entry = {
          type: 'pull_request',
          actor,
          action,
          ref: pr.head?.ref || '',
          prNumber: pr.number,
          merged,
          commitCount: undefined,
          commits: [],
          date: new Date(pr.updated_at || pr.created_at || new Date())
        };
        project.githubActivity.push(entry);
      } catch {
      }
    }
    await project.save();
  }

  async syncProject(project) {
    if (!project?.github || !project.github.repoOwner || !project.github.repoName) return null;
    
    try {
      await this.fetchAndStoreCommits(project);
    } catch (err) {
      console.error(`Failed to sync commits for ${project.name}:`, err.message);
    }
    
    try {
      await this.fetchAndStorePulls(project);
    } catch (err) {
      console.error(`Failed to sync PRs for ${project.name}:`, err.message);
    }
    
    return project;
  }

  async syncProjectById(projectId, userId) {
    const project = await Project.findOne({ _id: projectId, createdBy: userId });
    if (!project) return null;
    await this.syncProject(project);
    return project;
  }

  async syncAllProjects() {
    const projects = await Project.find({ 'github.repoOwner': { $exists: true, $ne: null }, 'github.repoName': { $exists: true, $ne: null } });
    for (const p of projects) {
      try {
        await this.syncProject(p);
      } catch {
      }
    }
  }
}

export default new GitHubService();
