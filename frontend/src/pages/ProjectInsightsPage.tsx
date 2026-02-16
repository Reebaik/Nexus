import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import styles from '../styles/ProjectOverviewPage.module.css';
import type { ProjectOutletContext } from './ProjectLayout';

type GitHubActivityItem = {
  type: 'push' | 'pull_request';
  actor?: string;
  action?: string;
  ref?: string;
  prNumber?: number;
  merged?: boolean;
  commitCount?: number;
  commits?: Array<{ sha?: string; message?: string }>;
  date?: string | Date;
};

const ProjectInsightsPage: React.FC = () => {
  const { project } = useOutletContext<ProjectOutletContext>();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [repo, setRepo] = React.useState<{ repoOwner?: string; repoName?: string } | null>(
    project.github && project.github.repoName ? project.github : null
  );
  const [activity, setActivity] = React.useState<GitHubActivityItem[]>([]);
  const [syncing, setSyncing] = React.useState(false);

  const fetchActivity = React.useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('nexus_jwt') || '';
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/projects/${project._id}/github/activity`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      if (res.ok) {
        const data = await res.json();
        setRepo(data.repo || null);
        setActivity(Array.isArray(data.activity) ? data.activity : []);
      } else {
        console.error('Failed to fetch activity:', res.status, res.statusText);
        // Don't clear repo if we already have it from context
        if (!repo && project.github?.repoName) {
           setRepo(project.github);
        }
        setActivity([]);
      }
    } catch (err) {
      console.error('Error fetching activity:', err);
      // Don't clear repo on error
      setActivity([]);
    } finally {
      setLoading(false);
    }
  }, [project._id, repo, project.github]);

  React.useEffect(() => {
    if (project?._id) {
      fetchActivity();
    }
  }, [project?._id, fetchActivity]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const token = localStorage.getItem('nexus_jwt') || '';
      await fetch(
        `${import.meta.env.VITE_API_URL}/api/projects/${project._id}/github/sync`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      await fetchActivity();
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      setSyncing(false);
    }
  };

  const githubRepoUrl =
    repo?.repoOwner && repo?.repoName
      ? `https://github.com/${repo.repoOwner}/${repo.repoName}`
      : null;

  const formatWhen = (d?: string | Date) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleString();
  };

  const iconFor = (item: GitHubActivityItem) =>
    item.type === 'push' ? '⬆️' : '🔀';

  const handleConnect = () => {
    // Navigate directly to the integrations page to handle the connection
    navigate(`/integrations/github/connected?project_id=${project._id}`);
  };

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Insights</h1>
          <p className={styles.lead}>Repository link and recent GitHub activity.</p>
        </div>
        <div>
          {repo ? (
            <button
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(0, 200, 83, 0.15)',
                color: '#00c853',
                border: '1px solid rgba(0, 200, 83, 0.35)',
                cursor: 'pointer'
              }}
              onClick={handleConnect}
            >
              Connected · Manage
            </button>
          ) : (
            <button
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: '#0072ff',
                color: '#fff',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={handleConnect}
            >
              Connect GitHub
            </button>
          )}
        </div>
      </div>

      <div className={styles.block}>
        <h3>Connected Repository</h3>
        {githubRepoUrl ? (
          <p>
            <a href={githubRepoUrl} target="_blank" rel="noreferrer">
              {repo?.repoOwner}/{repo?.repoName}
            </a>
          </p>
        ) : (
          <p>No repository attached yet.</p>
        )}
      </div>

      <div className={styles.block}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3>Recent GitHub Activity</h3>
          {repo && (
            <button
              onClick={() => { void handleSync(); }}
              disabled={syncing || loading}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                background: '#f0f0f0',
                border: '1px solid #ccc',
                cursor: syncing ? 'wait' : 'pointer',
                fontSize: '13px'
              }}
            >
              {syncing ? 'Syncing...' : 'Sync Now ↻'}
            </button>
          )}
        </div>
        {loading ? (
          <p>Loading activity…</p>
        ) : activity.length === 0 ? (
          <p>No recent activity.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activity.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    flexShrink: 0
                  }}
                >
                  {iconFor(item)}
                </div>
                <div style={{ flex: 1 }}>
                  {item.type === 'push' ? (
                    <div>
                      <div style={{ fontSize: 14 }}>
                        <strong>{item.actor || 'Someone'}</strong> pushed{' '}
                        {item.commitCount || 0} commit
                        {(item.commitCount || 0) === 1 ? '' : 's'} to{' '}
                        <strong>{item.ref || 'unknown ref'}</strong>
                      </div>
                      {item.commits && item.commits.length > 0 && (
                        <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                          {item.commits.slice(0, 3).map((c, i) => (
                            <li key={i} style={{ fontSize: 13, opacity: 0.9 }}>
                              {(c.sha || '').slice(0, 7)} — {c.message}
                            </li>
                          ))}
                          {item.commits.length > 3 && (
                            <li style={{ fontSize: 13, opacity: 0.7 }}>
                              …and {item.commits.length - 3} more
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 14 }}>
                      <strong>{item.actor || 'Someone'}</strong>{' '}
                      {item.action || 'updated'} PR #{item.prNumber}{' '}
                      {item.merged ? '(merged)' : ''}
                      {item.ref ? ` on ${item.ref}` : ''}
                    </div>
                  )}
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                    {formatWhen(item.date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProjectInsightsPage;
