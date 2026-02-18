import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/IntegrationsGithubConnected.module.css';

interface ProjectsListItem {
  _id: string;
  name: string;
}

interface ProjectsListResponse {
  projects?: ProjectsListItem[];
}

const IntegrationsGithubConnected: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [installed, setInstalled] = React.useState(false);
  const [installationId, setInstallationId] = React.useState<string>('');
  const [projects, setProjects] = React.useState<Array<ProjectsListItem>>([]);
  const [selectedProject, setSelectedProject] = React.useState<string>('');
  const [repos, setRepos] = React.useState<Array<{ owner: string; name: string }>>([]);
  const [selectedRepoKey, setSelectedRepoKey] = React.useState<string>('');
  const [accountLogin, setAccountLogin] = React.useState<string>('');
  const [status, setStatus] = React.useState<string>('');
  const [autoProjectId, setAutoProjectId] = React.useState<string>('');

  // 1. Fetch Projects List
  React.useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem('nexus_jwt') || '';
        if (!token) return;
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data: ProjectsListResponse = await res.json();
        const list = Array.isArray(data.projects) ? data.projects : [];
        setProjects(list.map((p) => ({ _id: p._id, name: p.name })));
      } catch {
        // ignore
      }
    };
    fetchProjects();
  }, []);

  // 2. Check Installation Status & Handle Redirects
  React.useEffect(() => {
    const init = async () => {
      setLoading(true);
      const params = new URLSearchParams(window.location.search);
      const urlInstallationId = params.get('installation_id');
      const projectHint = params.get('state') || params.get('project_id');

      if (projectHint) {
        setAutoProjectId(projectHint);
        setSelectedProject(projectHint);
      }

      const token = localStorage.getItem('nexus_jwt') || '';
      if (!token) {
        setLoading(false);
        return;
      }

      // If URL has installation_id, save it to user profile first
      if (urlInstallationId) {
        try {
          await fetch(`${import.meta.env.VITE_API_URL}/api/github/installation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ installationId: urlInstallationId })
          });
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname + (projectHint ? `?project_id=${projectHint}` : ''));
        } catch (err) {
          console.error('Failed to save installation ID', err);
        }
      }

      // Check User's GitHub Status
      await checkStatus(token);
      setLoading(false);
    };
    init();
  }, []);

  const checkStatus = async (token: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/github/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();

      if (data.installed) {
        setInstalled(true);
        setInstallationId(data.installationId);
        setRepos(data.repositories || []);
        // Try to guess account login from first repo if not explicitly sent
        if (data.repositories?.length > 0) {
          setAccountLogin(data.repositories[0].owner);
          setSelectedRepoKey(`${data.repositories[0].owner}/${data.repositories[0].name}`);
        }
      } else {
        setInstalled(false);
      }
    } catch (err) {
      console.error('Error checking status:', err);
    }
  };

  const attach = async () => {
    setStatus('');
    if (!selectedProject) {
      setStatus('Select a project first.');
      return;
    }
    if (!selectedRepoKey) {
      setStatus('Select a repository.');
      return;
    }

    const [owner, name] = selectedRepoKey.split('/');
    if (!owner || !name) {
      setStatus('Invalid repository selection.');
      return;
    }

    try {
      const token = localStorage.getItem('nexus_jwt') || '';
      const payload = { github: { installationId, repoOwner: owner, repoName: name } };
      
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${selectedProject}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.message || 'Failed to attach repository.');
        return;
      }
      
      setStatus('Attached successfully! Syncing recent activity...');
      
      // Trigger initial sync
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${selectedProject}/github/sync`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Initial sync failed', err);
      }

      setStatus('Sync complete! Redirecting...');
      setTimeout(() => navigate(`/projects/${selectedProject}/insights`), 500);
    } catch {
      setStatus('Server error. Please try again.');
    }
  };

  if (loading) {
    return (
      <>
        <div className={styles.bgWrapper}>
          <div className={styles.bgGradient} />
          <div className={styles.gridOverlay} />
        </div>
        <div className={styles.loader}>
          Loading GitHub status...
        </div>
      </>
    );
  }

  // Not Installed View
  if (!installed) {
    return (
      <>
        <div className={styles.bgWrapper}>
          <div className={styles.bgGradient} />
          <div className={styles.gridOverlay} />
        </div>
        <section className={styles.notInstalledContainer}>
          <div className={styles.card} style={{ maxWidth: 600 }}>
            <div className={styles.iconWrapper}>🐙</div>
            <h1 style={{ marginBottom: 16, fontSize: '2rem', color: '#f1f5f9' }}>Connect GitHub</h1>
            <p className={styles.lead} style={{ margin: '0 auto 32px', maxWidth: 400 }}>
              Connect your GitHub account to Nexus Project Hub to track commits and pull requests directly in your project dashboard.
            </p>
            <a
              href={`https://github.com/apps/NEXUS-PROJECT-HUB/installations/new?state=${selectedProject}`}
              className={styles.installButton}
            >
              Install GitHub App
            </a>
          </div>
        </section>
      </>
    );
  }

  // Installed View
  return (
    <>
      <div className={styles.bgWrapper}>
        <div className={styles.bgGradient} />
        <div className={styles.gridOverlay} />
      </div>

      <div className={styles.container}>
        <div className={styles.contentWrapper}>
          <div className={styles.header}>
            <div className={styles.titleGroup}>
              <h1>GitHub Integration</h1>
              <p className={styles.lead}>
                Manage your repository connection for project {selectedProject ? `(${projects.find(p => p._id === selectedProject)?.name || selectedProject})` : ''}.
              </p>
            </div>
            <button 
              onClick={() => navigate(-1)}
              className={styles.backButton}
            >
              ← Back
            </button>
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Link Repository</h2>
            
            {/* Project Selection */}
            {!autoProjectId && (
              <div className={styles.formGroup}>
                <div className={styles.labelGroup}>
                  <label className={styles.label}>Select Project</label>
                </div>
                <div className={styles.selectWrapper}>
                  <select
                    value={selectedProject}
                    onChange={e => setSelectedProject(e.target.value)}
                    className={styles.select}
                  >
                    <option value="">Select a project…</option>
                    {projects.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Repository Selection */}
            <div className={styles.formGroup}>
              <div className={styles.labelGroup}>
                <label className={styles.label}>
                  Select Repository
                  {accountLogin && <span className={styles.subLabel}>({accountLogin})</span>}
                </label>
                <button 
                  onClick={() => { void checkStatus(localStorage.getItem('nexus_jwt') || ''); }}
                  className={styles.refreshButton}
                >
                  Refresh ↻
                </button>
              </div>
              <div className={styles.selectWrapper}>
                <select
                  value={selectedRepoKey}
                  onChange={e => setSelectedRepoKey(e.target.value)}
                  className={styles.select}
                >
                  {repos.length === 0 ? (
                    <option value="">No repositories found</option>
                  ) : (
                    repos.map(r => {
                      const key = `${r.owner}/${r.name}`;
                      return <option key={key} value={key}>{key}</option>;
                    })
                  )}
                </select>
              </div>
              
              {/* Manage Access Link */}
              <div className={styles.helperText}>
                <span>Don't see your repo?</span>
                <a 
                  href={`https://github.com/apps/NEXUS-PROJECT-HUB/installations/${installationId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  Manage Access &rarr;
                </a>
              </div>
            </div>

            <button
              onClick={() => { void attach(); }}
              disabled={!selectedProject || !selectedRepoKey}
              className={styles.actionButton}
            >
              Link Repository
            </button>

            {status && (
              <div className={`${styles.statusMessage} ${status.includes('success') ? styles.statusSuccess : styles.statusError}`}>
                {status}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default IntegrationsGithubConnected;
