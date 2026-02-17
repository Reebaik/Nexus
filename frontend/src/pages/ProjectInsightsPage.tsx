import React, { useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import styles from '../styles/ProjectOverviewPage.module.css';
import chartStyles from '../styles/TrackingCharts.module.css';
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

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee?: string;
  taskMembers?: string[];
  teamMembers?: string[];
  dueDate: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  completedAt?: string | Date;
  estimatedHours: number;
  actualHours: number;
  dependencies: string[];
  startDate?: string | Date;
  endDate?: string | Date;
}

const ProjectInsightsPage: React.FC = () => {
  const { project } = useOutletContext<ProjectOutletContext>();
  const navigate = useNavigate();
  const tasks = (project.tasks ?? []) as Task[];
  
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
        setRepo((currentRepo) => {
          if (!currentRepo && project.github?.repoName) {
             return project.github;
          }
          return currentRepo;
        });
        setActivity([]);
      }
    } catch (err) {
      console.error('Error fetching activity:', err);
      setActivity([]);
    } finally {
      setLoading(false);
    }
  }, [project._id, project.github]);

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

  const handleConnect = () => {
    navigate(`/integrations/github/connected?project_id=${project._id}`);
  };

  // Helper functions for charts
  const toDate = (value?: string | Date) => {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const today = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const getTaskMembers = (task: Task): string[] => {
    if (Array.isArray(task.taskMembers) && task.taskMembers.length > 0) return task.taskMembers;
    if (Array.isArray(task.teamMembers) && task.teamMembers.length > 0) return task.teamMembers;
    return [];
  };

  // Workload Distribution Logic
  const workloadDistribution = useMemo(() => {
    const allTeamMembers = project.teamMembers || [];
    
    const workloadData = allTeamMembers.reduce<Record<string, { activeTasks: number; totalTasks: number }>>((acc, member) => {
      const memberTasks = tasks.filter(task => {
        const members = getTaskMembers(task);
        return members.includes(member);
      });

      const activeTasks = memberTasks.filter(task => task.status !== 'done').length;
      const totalTasks = memberTasks.length;
      
      acc[member] = {
        activeTasks,
        totalTasks
      };
      
      return acc;
    }, {});
    
    return Object.entries(workloadData)
      .map(([name, data]) => ({
        name,
        activeTasks: data.activeTasks,
        totalTasks: data.totalTasks,
        completionRate: data.totalTasks > 0 ? Math.round((data.totalTasks - data.activeTasks) / data.totalTasks * 100) : 0
      }))
      .sort((a, b) => b.activeTasks - a.activeTasks);
  }, [tasks, project.teamMembers]);
  
  const OVERLOAD_THRESHOLD = 5;

  return (
    <>
      <div className={styles.bgWrapper}>
        <div className={styles.bgGradient} />
        <div className={styles.gridOverlay} />
      </div>
      <section className={chartStyles.trackingContainer}>
        <div className={styles.overviewHeader}>
          <h1>Insights & Analytics</h1>
          <p className={styles.lead}>
            Deep dive into project health, team workload, and development activity.
          </p>
        </div>

        {/* 1) Schedule Health Indicators */}
        <div className={chartStyles.chartBlock}>
          <div className={chartStyles.chartHeader}>
            <h2 className={chartStyles.chartTitle}>Schedule Health</h2>
            <p className={chartStyles.chartSubtitle}>Identify risks and bottlenecks early</p>
          </div>

          {(() => {
            const overdueCount = tasks.filter((t) => {
              const due = toDate((t.endDate as any) || t.dueDate);
              return Boolean(due) && startOfDay(due as Date).getTime() < startOfDay(today).getTime() && t.status !== 'done';
            }).length;

            const dueThisWeekCount = tasks.filter((t) => {
              const due = toDate((t.endDate as any) || t.dueDate);
              if (!due) return false;
              const d = startOfDay(due);
              const start = startOfDay(today);
              const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
              return d.getTime() >= start.getTime() && d.getTime() <= end.getTime() && t.status !== 'done';
            }).length;

            const blockedCount = tasks.filter((t) => {
              if (!t.dependencies || t.dependencies.length === 0) return false;
              return t.dependencies.some((depId) => {
                const dep = tasks.find((x) => x.id === depId);
                return dep ? dep.status !== 'done' : false;
              });
            }).length;

            return (
              <div className={chartStyles.healthGrid}>
                <div className={chartStyles.healthCard}>
                  <div className={`${chartStyles.healthIcon} ${chartStyles.overdue}`}>🚨</div>
                  <div className={chartStyles.healthContent}>
                    <div className={chartStyles.healthValue}>{overdueCount}</div>
                    <div className={chartStyles.healthLabel}>Tasks Overdue</div>
                  </div>
                </div>
                <div className={chartStyles.healthCard}>
                  <div className={`${chartStyles.healthIcon} ${chartStyles.dueSoon}`}>⏰</div>
                  <div className={chartStyles.healthContent}>
                    <div className={chartStyles.healthValue}>{dueThisWeekCount}</div>
                    <div className={chartStyles.healthLabel}>Due This Week</div>
                  </div>
                </div>
                <div className={chartStyles.healthCard}>
                  <div className={`${chartStyles.healthIcon} ${chartStyles.blocked}`}>🚫</div>
                  <div className={chartStyles.healthContent}>
                    <div className={chartStyles.healthValue}>{blockedCount}</div>
                    <div className={chartStyles.healthLabel}>Tasks Blocked</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* 2) Workload Distribution Chart */}
        <div className={`${chartStyles.chartBlock} ${chartStyles.workloadChart}`}>
          <div className={chartStyles.chartHeader}>
            <h2 className={chartStyles.chartTitle}>Workload Distribution</h2>
            <p className={chartStyles.chartSubtitle}>Active tasks per team member (excluding completed tasks)</p>
          </div>
          <div style={{ width: '100%', height: Math.max(200, workloadDistribution.length * 80), maxWidth: '900px', margin: '0 auto' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={workloadDistribution}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
                barCategoryGap={24}
                barSize={32}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  stroke="#94a3b8"
                  label={{ value: 'Active Tasks', position: 'insideBottomRight', offset: -10, fill: '#94a3b8' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  stroke="#94a3b8"
                  width={80}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                    color: '#f1f5f9'
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const isOverloaded = payload[0].payload.activeTasks > OVERLOAD_THRESHOLD;
                      return (
                        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#f1f5f9' }}>
                          <p style={{ margin: '0 0 8px 0', color: '#f1f5f9' }}><strong>{payload[0].name}</strong></p>
                          <p style={{ margin: '4px 0', color: '#9ca3af' }}>📋 Active Tasks: {payload[0].payload.activeTasks}</p>
                          <p style={{ margin: '4px 0', color: '#9ca3af' }}>📊 Total Tasks: {payload[0].payload.totalTasks}</p>
                          <p style={{ margin: '4px 0', color: '#9ca3af' }}>✅ Completion Rate: {payload[0].payload.completionRate}%</p>
                          {isOverloaded && (
                            <p style={{ margin: '8px 0 0 0', color: '#ef4444', fontWeight: 'bold' }}>⚠️ Overloaded (&gt;{OVERLOAD_THRESHOLD} tasks)</p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{
                    paddingTop: '10px'
                  }}
                />
                <Bar 
                  dataKey="activeTasks" 
                  fill="#3b82f6" 
                  name="Active Tasks"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className={chartStyles.metricsGrid}>
            <div className={chartStyles.metricCard}>
              <div className={chartStyles.metricValue}>
                {workloadDistribution.filter(w => w.activeTasks > OVERLOAD_THRESHOLD).length}
              </div>
              <div className={chartStyles.metricLabel}>Overloaded Members</div>
            </div>
            <div className={chartStyles.metricCard}>
              <div className={chartStyles.metricValue}>
                {Math.round(workloadDistribution.reduce((sum, w) => sum + w.activeTasks, 0) / Math.max(1, workloadDistribution.length))}
              </div>
              <div className={chartStyles.metricLabel}>Avg. Active Tasks</div>
            </div>
            <div className={chartStyles.metricCard}>
              <div className={chartStyles.metricValue}>
                {Math.max(0, ...workloadDistribution.map(w => w.activeTasks))}
              </div>
              <div className={chartStyles.metricLabel}>Max. Active Tasks</div>
            </div>
            <div className={chartStyles.metricCard}>
              <div className={chartStyles.metricValue}>
                {workloadDistribution.length}
              </div>
              <div className={chartStyles.metricLabel}>Team Members</div>
            </div>
          </div>
        </div>

        {/* 3) GitHub Activity */}
        <div className={chartStyles.chartBlock}>
          <div className={chartStyles.chartHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 className={chartStyles.chartTitle}>GitHub Activity</h2>
              <p className={chartStyles.chartSubtitle}>Recent commits and pull requests</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {repo && (
                <button
                  onClick={() => { void handleSync(); }}
                  disabled={syncing || loading}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#f1f5f9',
                    cursor: syncing ? 'wait' : 'pointer',
                    fontSize: '13px'
                  }}
                >
                  {syncing ? 'Syncing...' : 'Sync Now ↻'}
                </button>
              )}
              {repo ? (
                <button
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: 'rgba(0, 200, 83, 0.15)',
                    color: '#4ade80',
                    border: '1px solid rgba(0, 200, 83, 0.35)',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                  onClick={handleConnect}
                >
                  Manage Connection
                </button>
              ) : (
                <button
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                  onClick={handleConnect}
                >
                  Connect GitHub
                </button>
              )}
            </div>
          </div>
          
          {loading ? (
            <p style={{ padding: 12, color: '#94a3b8' }}>Loading activity…</p>
          ) : activity.length === 0 ? (
            <div style={{ padding: 12 }}>
              <p style={{ color: '#94a3b8' }}>No recent activity found.</p>
              {!repo && (
                <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: 8 }}>
                  Connect a GitHub repository to see recent commits and pull requests here.
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {repo?.repoOwner && repo?.repoName && (
                <p style={{ opacity: 0.9 }}>
                  <a href={`https://github.com/${repo.repoOwner}/${repo.repoName}`} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>
                    {repo.repoOwner}/{repo.repoName}
                  </a>
                </p>
              )}
              {activity.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                    {item.type === 'push' ? '⬆️' : '🔀'}
                  </div>
                  <div style={{ flex: 1 }}>
                    {item.type === 'push' ? (
                      <div>
                        <div style={{ fontSize: 14, color: '#f1f5f9' }}>
                          <strong>{item.actor || 'Someone'}</strong> pushed {item.commitCount || 0} commit{(item.commitCount || 0) === 1 ? '' : 's'} {item.ref ? `to ${item.ref}` : ''}
                        </div>
                        {item.commits && item.commits.length > 0 && (
                          <ul style={{ marginTop: 6, paddingLeft: 18, color: '#94a3b8' }}>
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
                      <div style={{ fontSize: 14, color: '#f1f5f9' }}>
                        <strong>{item.actor || 'Someone'}</strong> {item.action || 'updated'} PR #{item.prNumber} {item.merged ? '(merged)' : ''} {item.ref ? `on ${item.ref}` : ''}
                      </div>
                    )}
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4, color: '#94a3b8' }}>
                      {item.date ? new Date(item.date).toLocaleString() : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default ProjectInsightsPage;