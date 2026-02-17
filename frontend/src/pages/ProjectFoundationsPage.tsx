import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import styles from '../styles/ProjectOverviewPage.module.css';
import type { ProjectOutletContext } from './ProjectLayout';
import RequirementModal from '../components/RequirementModal';
import { useUser } from '../contexts/UserContext';

const ProjectFoundationsPage: React.FC = () => {
  const { project } = useOutletContext<ProjectOutletContext>();
  const { canEditRequirements } = useUser();
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'functional' as 'functional' | 'non-functional',
    mode: 'add' as 'add' | 'edit',
    editingRequirement: null as any
  });
  const [expandedRequirements, setExpandedRequirements] = useState<Set<string>>(new Set());

  const toggleRequirementTasks = (reqId: string) => {
    setExpandedRequirements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reqId)) {
        newSet.delete(reqId);
      } else {
        newSet.add(reqId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'verified':
        return '#10b981'; // green
      case 'in-progress':
      case 'inprogress':
        return '#3b82f6'; // blue
      case 'review':
        return '#f59e0b'; // amber
      default:
        return '#6b7280'; // gray
    }
  };

  // Listen for project changes to ensure re-render when requirements update
  useEffect(() => {
    console.log('=== PROJECT FOUNDATIONS PAGE USEEFFECT TRIGGERED ===');
  }, [project, project?.functionalRequirements, project?.nonFunctionalRequirements]);

  const openModal = (type: 'functional' | 'non-functional', mode: 'add' | 'edit', requirement?: any) => {
    setModalState({
      isOpen: true,
      type,
      mode,
      editingRequirement: requirement || null
    });
  };

  const closeModal = () => {
    setModalState({
      ...modalState,
      isOpen: false
    });
  };

  const handleDeleteRequirement = async (id: string, type: 'functional' | 'non-functional') => {
    if (!confirm('Are you sure you want to delete this requirement?')) return;

    try {
      const token = localStorage.getItem('nexus_jwt');
      if (!token || !project._id) return;

      const url = type === 'functional' 
        ? `http://localhost:5000/api/projects/${project._id}/requirements/${id}`
        : `http://localhost:5000/api/projects/${project._id}/non-functional-requirements/${id}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Refresh project data by refetching
        const projectResponse = await fetch(`http://localhost:5000/api/projects/${project._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (projectResponse.ok) {
          window.location.reload();
        } else {
          console.error('Failed to refresh project data:', projectResponse.status);
        }
      } else {
        const errorData = await response.json();
        console.error('Delete requirement failed:', errorData);
      }
    } catch (error) {
      console.error('Error deleting requirement:', error);
    }
  };

  const handleSaveRequirement = async (requirement: any) => {
    try {
      const token = localStorage.getItem('nexus_jwt');
      if (!token || !project._id) return;

      const endpoint = modalState.mode === 'add' 
        ? (modalState.type === 'functional' 
            ? `/api/projects/${project._id}/requirements`
            : `/api/projects/${project._id}/non-functional-requirements`)
        : (modalState.type === 'functional'
            ? `/api/projects/${project._id}/requirements/${requirement.id}`
            : `/api/projects/${project._id}/non-functional-requirements/${requirement.id}`);

      const method = modalState.mode === 'add' ? 'POST' : 'PUT';
      const url = `http://localhost:5000${endpoint}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requirement)
      });
      
      if (response.ok) {
        closeModal();
        // Refresh project data
        const projectResponse = await fetch(`http://localhost:5000/api/projects/${project._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (projectResponse.ok) {
          window.location.reload();
        } else {
          console.error('Failed to refresh project data:', projectResponse.status);
        }
      } else {
        const errorData = await response.json();
        console.error('Save requirement failed:', errorData);
      }
    } catch (error) {
      console.error('Error saving requirement:', error);
    }
  };

  return (
    <div className={styles.overviewContainer}>
      {/* Animated Background */}
      <div className={styles.bgWrapper}>
        <div className={styles.bgGradient}></div>
        <div className={styles.gridOverlay}></div>
      </div>

      <div className={styles.overviewHeader}>
        <h1>Project Foundations</h1>
        <p className={styles.lead}>
          Define core requirements and scope before execution begins.
        </p>
      </div>

      {/* Project Overview Card */}
      <div className={styles.detailCard} style={{ marginBottom: '48px' }}>
        <h3>Project Scope & Objectives</h3>
        <div className={styles.metaGrid}>
          <div>
            <span>Objective</span>
            <strong>{project.objective}</strong>
          </div>
          <div>
            <span>Scope</span>
            <strong>{project.description}</strong>
          </div>
        </div>
      </div>

      {/* Functional Requirements */}
      <div className={styles.requirementsSection}>
        <div className={styles.requirementsHeader}>
          <h2>Functional Requirements</h2>
          {canEditRequirements(project) && (
            <button 
              className={styles.addButton}
              onClick={() => openModal('functional', 'add')}
            >
              + Add Requirement
            </button>
          )}
        </div>
        
        <div className={`${styles.requirementsGrid} ${styles.scrollableGrid}`}>
          {project.functionalRequirements?.map((req) => (
            <div key={req.id} className={styles.requirementItem}>
              <div className={styles.reqItemHeader}>
                <div className={styles.reqItemLeft}>
                  <span className={styles.requirementId}>{req.id}</span>
                </div>
                <span 
                  className={styles.requirementStatus}
                  style={{ backgroundColor: getStatusColor(req.status) }}
                >
                  {req.status}
                </span>
              </div>
              
              <h4 className={styles.requirementTitle}>{req.title}</h4>
              <p className={styles.requirementDescription}>{req.description}</p>
              
              <div className={styles.requirementMeta}>
                <span className={styles.priorityBadge} data-priority={req.priority}>
                  {req.priority}
                </span>
              </div>

              <div className={styles.cardActions}>
                <button 
                  className={styles.viewTasksButton}
                  onClick={() => toggleRequirementTasks(req.id)}
                >
                  {expandedRequirements.has(req.id) ? 'Hide Tasks' : 'View Tasks'}
                </button>
                
                {canEditRequirements(project) && (
                  <div className={styles.actionButtons}>
                    <button 
                      className={styles.editButton}
                      onClick={() => openModal('functional', 'edit', req)}
                    >
                      Edit
                    </button>
                    <button 
                      className={styles.deleteButton}
                      onClick={() => handleDeleteRequirement(req.id, 'functional')}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {expandedRequirements.has(req.id) && (
                <div className={styles.tasksContainer}>
                  <div className={styles.tasksList}>
                    {project.tasks?.filter(task => 
                      task.linkedRequirement?.type === 'functional' && 
                      task.linkedRequirement?.id === req.id
                    ).map(task => (
                      <div key={task.id} className={styles.taskItem}>
                        <span className={styles.taskItemTitle}>{task.title}</span>
                        <span className={styles.taskItemStatus}>{task.status}</span>
                      </div>
                    ))}
                    {(!project.tasks?.some(task => 
                      task.linkedRequirement?.type === 'functional' && 
                      task.linkedRequirement?.id === req.id
                    )) && (
                      <div className={styles.noTasks}>No tasks assigned</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Non-Functional Requirements */}
      <div className={styles.requirementsSection}>
        <div className={styles.requirementsHeader}>
          <h2>Non-Functional Requirements</h2>
          {canEditRequirements(project) && (
            <button 
              className={styles.addButton}
              onClick={() => openModal('non-functional', 'add')}
            >
              + Add Requirement
            </button>
          )}
        </div>
        
        <div className={`${styles.requirementsGrid} ${styles.scrollableGrid}`}>
          {project.nonFunctionalRequirements?.map((req) => (
            <div key={req.id} className={styles.requirementItem}>
              <div className={styles.reqItemHeader}>
                <div className={styles.reqItemLeft}>
                  <span className={styles.requirementId}>{req.id}</span>
                  <span className={styles.nfrCategoryBadge}>{req.category}</span>
                </div>
                <span 
                  className={styles.requirementStatus}
                  style={{ backgroundColor: getStatusColor(req.status) }}
                >
                  {req.status}
                </span>
              </div>
              
              <h4 className={styles.requirementTitle}>{req.title}</h4>
              <p className={styles.requirementDescription}>{req.description}</p>
              
              <div className={styles.requirementMeta}>
                <span className={styles.priorityBadge} data-priority={req.priority}>
                  {req.priority}
                </span>
              </div>

              <div className={styles.cardActions}>
                <button 
                  className={styles.viewTasksButton}
                  onClick={() => toggleRequirementTasks(req.id)}
                >
                  {expandedRequirements.has(req.id) ? 'Hide Tasks' : 'View Tasks'}
                </button>
                
                {canEditRequirements(project) && (
                  <div className={styles.actionButtons}>
                    <button 
                      className={styles.editButton}
                      onClick={() => openModal('non-functional', 'edit', req)}
                    >
                      Edit
                    </button>
                    <button 
                      className={styles.deleteButton}
                      onClick={() => handleDeleteRequirement(req.id, 'non-functional')}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {expandedRequirements.has(req.id) && (
                <div className={styles.tasksContainer}>
                  <div className={styles.tasksList}>
                    {project.tasks?.filter(task => 
                      task.linkedRequirement?.type === 'non-functional' && 
                      task.linkedRequirement?.id === req.id
                    ).map(task => (
                      <div key={task.id} className={styles.taskItem}>
                        <span className={styles.taskItemTitle}>{task.title}</span>
                        <span className={styles.taskItemStatus}>{task.status}</span>
                      </div>
                    ))}
                    {(!project.tasks?.some(task => 
                      task.linkedRequirement?.type === 'non-functional' && 
                      task.linkedRequirement?.id === req.id
                    )) && (
                      <div className={styles.noTasks}>No tasks assigned</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <RequirementModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onSave={handleSaveRequirement}
        type={modalState.type}
        mode={modalState.mode}
        requirement={modalState.editingRequirement}
      />
    </div>
  );
};

export default ProjectFoundationsPage;
