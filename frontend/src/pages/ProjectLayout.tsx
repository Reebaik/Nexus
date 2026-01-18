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

        console.log('ProjectLayout - Making API call to:', `http://localhost:5000/api/projects/${id}`);
        const response = await fetch(`http://localhost:5000/api/projects/${id}`, {
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

  const navItems: Array<{ to: string; label: string }> = [
    { to: 'overview', label: 'Overview' },
    { to: 'foundations', label: 'Project Foundations' },
    { to: 'planning', label: 'Planning' },
    { to: 'execution', label: 'Execution' },
    { to: 'tracking', label: 'Tracking' },
    { to: 'insights', label: 'Insights' }
  ];

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <h2 className={styles.projectName}>{project.name}</h2>
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
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className={styles.content}>
        <Outlet context={{ project, setProject }} />
      </main>
    </div>
  );
};

export default ProjectLayout;
