import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import styles from '../styles/ProjectOverviewPage.module.css';

export interface Project {
  _id: string;
  name: string;
  objective: string;
  description: string;
  startDate: string | Date;
  targetEndDate: string | Date;
  createdBy: string | { username: string; email: string };
  teamMembers?: string[];
  github?: {
    repoOwner?: string;
    repoName?: string;
    installationId?: string;
  };
  functionalRequirements?: any[];
  nonFunctionalRequirements?: any[];
  tasks?: any[];
  milestones?: any[];
}

export type ProjectOutletContext = {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project | null>>;
};

const ProjectLayout: React.FC = () => {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('nexus_jwt');
        console.log('ProjectLayout - Fetching project with ID:', id);
        console.log('ProjectLayout - Token available:', !!token);
        
        if (!token || !id) {
          console.log('ProjectLayout - No token or ID, cannot fetch project');
          setProject(null);
          return;
        }

        console.log('ProjectLayout - Making API call to:', `${import.meta.env.VITE_API_URL}/api/projects/${id}`);
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('ProjectLayout - API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('ProjectLayout - API response data:', data);
          
          // Map backend tasks to frontend structure, converting tags to teamMembers
          if (data.project && data.project.tasks) {
            data.project.tasks = data.project.tasks.map((task: any) => ({
              ...task,
              // Convert tags array to teamMembers for frontend
              teamMembers: (task.tags && Array.isArray(task.tags) && task.tags.length > 0 ? task.tags :
                          (task.teamMembers && task.teamMembers.length > 0 ? task.teamMembers :
                          (task.assignee ? [task.assignee] : []))),
              linkedRequirement: task.linkedRequirement || '', // Add linkedRequirement field
              // Keep tags for persistence
              tags: task.tags
            }));
          }
          
          setProject(data.project);
        } else {
          const errorData = await response.json();
          console.error('ProjectLayout - API error:', errorData);
          setProject(null);
        }
      } catch (e) {
        console.error('ProjectLayout - Fetch error:', e);
        setProject(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <h1>Loading project...</h1>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <h1>Project not found</h1>
        </div>
      </div>
    );
  }

  const navItems: Array<{ to: string; label: string; icon: string }> = [
    { to: 'overview', label: 'Overview', icon: '📊' },
    { to: 'foundations', label: 'Foundations', icon: '🏗️' },
    { to: 'planning', label: 'Planning', icon: '📋' },
    { to: 'execution', label: 'Execution', icon: '⚡' },
    { to: 'tracking', label: 'Tracking', icon: '📈' },
    { to: 'insights', label: 'Insights', icon: '💡' }
  ];

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${!sidebarOpen ? styles.sidebarClosed : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.projectName}>{project.name}</h2>
          <button
            className={styles.sidebarClose}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            &times;
          </button>
        </div>
        
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
              end={item.to === 'overview'}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Overlay to close sidebar on mobile */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className={`${styles.content} ${!sidebarOpen ? styles.contentExpanded : ''}`}>
        {!sidebarOpen && (
          <button
            className={styles.menuButton}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <span className={styles.menuIcon} />
            <span className={styles.menuIcon} />
            <span className={styles.menuIcon} />
          </button>
        )}
        <Outlet context={{ project, setProject }} />
      </main>
    </div>
  );
};

export default ProjectLayout;
