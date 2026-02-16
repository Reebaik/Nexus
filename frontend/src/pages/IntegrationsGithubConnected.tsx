import React from 'react';
import { useNavigate } from 'react-router-dom';

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
  const [debugInfo, setDebugInfo] = React.useState<Record<string, unknown> | null>(null);
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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/github/status?debug=1`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();

      if (data.installed) {
        setInstalled(true);
        setInstallationId(data.installationId);
        setRepos(data.repositories || []);
        setDebugInfo(data.debug);
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
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading GitHub status...</div>;
  }

  // Not Installed View
  if (!installed) {
    return (
      <div style={{ maxWidth: 520, margin: '40px auto', padding: 20, textAlign: 'center' }}>
        <h1 style={{ marginBottom: 16 }}>Connect GitHub</h1>
        <p style={{ marginBottom: 24, color: '#666' }}>
          Connect your GitHub account to Nexus Project Hub to track commits and pull requests.
        </p>
        <a
          href={`https://github.com/apps/NEXUS-PROJECT-HUB/installations/new?state=${selectedProject}`}
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#2da44e',
            color: '#fff',
            borderRadius: 6,
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '16px'
          }}
        >
          Install GitHub App
        </a>
      </div>
    );
  }

  // Installed View
  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: 20 }}>
      <h1 style={{ marginBottom: 8 }}>Link Repository</h1>
      <p style={{ opacity: 0.9, marginBottom: 20 }}>
        Select a repository to link to your project.
      </p>

      {/* Project Selection */}
      {!autoProjectId && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Project</label>
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
          >
            <option value="">Select a project…</option>
            {projects.map(p => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Repository Selection */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ fontWeight: 500 }}>
            Repository
            {accountLogin && <span style={{ fontWeight: 'normal', color: '#666', marginLeft: 8 }}>({accountLogin})</span>}
          </label>
          <button 
            onClick={() => { void checkStatus(localStorage.getItem('nexus_jwt') || ''); }}
            style={{ background: 'none', border: 'none', color: '#0072ff', cursor: 'pointer', fontSize: '12px' }}
          >
            Refresh ↻
          </button>
        </div>
        <select
          value={selectedRepoKey}
          onChange={e => setSelectedRepoKey(e.target.value)}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
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
        
        {/* Manage Access Link */}
        <div style={{ marginTop: 8, fontSize: '14px' }}>
          <span style={{ color: '#666' }}>Don't see your repo? </span>
          <a 
            href={`https://github.com/apps/NEXUS-PROJECT-HUB/installations/${installationId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0072ff', textDecoration: 'none' }}
          >
            Manage Access &rarr;
          </a>
        </div>
      </div>

      <button
        onClick={() => { void attach(); }}
        disabled={!selectedProject || !selectedRepoKey}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: 8,
          background: (!selectedProject || !selectedRepoKey) ? '#ccc' : '#0072ff',
          color: '#fff',
          border: 'none',
          cursor: (!selectedProject || !selectedRepoKey) ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: 600
        }}
      >
        Link Repository
      </button>

      {status && (
        <div style={{ 
          marginTop: 16, 
          padding: 12, 
          borderRadius: 8, 
          background: status.includes('success') ? '#e6fffa' : '#fff5f5',
          color: status.includes('success') ? '#2c7a7b' : '#c53030'
        }}>
          {status}
        </div>
      )}

      {debugInfo && (
        <details style={{ marginTop: 24, color: '#666', fontSize: '12px' }}>
          <summary>Debug Info</summary>
          <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default IntegrationsGithubConnected;
