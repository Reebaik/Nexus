import express from 'express';
import jwt from 'jsonwebtoken';
import githubService from '../services/githubService.js';
import User from '../models/User.js';

const router = express.Router();

router.post('/webhook', express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }), async (req, res) => {
  try {
    if (!githubService.verifyWebhookSignature(req.headers, req.rawBody)) {
      return res.status(401).send('Invalid signature');
    }
    const event = req.header('X-GitHub-Event') || req.header('x-github-event');
    const payload = req.body;

    if (event === 'push') {
      await githubService.handlePushEvent(payload);
      return res.status(200).send('ok');
    }
    if (event === 'pull_request') {
      await githubService.handlePullRequestEvent(payload);
      return res.status(200).send('ok');
    }

    // For now, ignore other events at Level 1
    return res.status(200).send('ignored');
  } catch (err) {
    console.error('GitHub webhook error:', err);
    return res.status(500).send('server error');
  }
});

// Simple auth middleware (same as used in projects routes)
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// GET /api/github/status - Check if user has an installation
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.githubInstallationId) {
      return res.json({ installed: false });
    }

    const installationId = user.githubInstallationId;
    const withDebug = String(req.query.debug || '') === '1';
    
    // Fetch repos for this installation
    try {
      const result = await githubService.listInstallationRepositories(installationId, withDebug);
      return res.json({ 
        installed: true, 
        installationId, 
        repositories: result.repos || [],
        debug: result.debug 
      });
    } catch (err) {
      console.error('Error fetching repos for stored installation:', err);
      // If the installation is invalid or revoked, we might want to return installed: false
      // But for now let's return the error so we can debug
      return res.status(500).json({ message: 'Error fetching repositories', error: err.message });
    }
  } catch (err) {
    console.error('Error checking GitHub status:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/github/installation - Save installation ID to user
router.post('/installation', authMiddleware, async (req, res) => {
  try {
    const { installationId } = req.body;
    if (!installationId) {
      return res.status(400).json({ message: 'installationId is required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.githubInstallationId = installationId;
    await user.save();

    return res.json({ success: true, installationId });
  } catch (err) {
    console.error('Error saving installation ID:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/github/installation/:installationId/repos
router.get('/installation/:installationId/repos', authMiddleware, async (req, res) => {
  try {
    const { installationId } = req.params;
    const withDebug = String(req.query.debug || '') === '1';
    const result = await githubService.listInstallationRepositories(installationId, withDebug);
    if (withDebug) {
      console.log('List repos debug', { installationId, debug: result.debug });
    }
    return res.json(result);
  } catch (err) {
    console.error('Error listing installation repos:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
