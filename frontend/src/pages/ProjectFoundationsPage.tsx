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

  // Listen for project changes to ensure re-render when requirements update
  useEffect(() => {
    console.log('=== PROJECT FOUNDATIONS PAGE USEEFFECT TRIGGERED ===');
    console.log('Project data:', {
      functionalRequirements: project?.functionalRequirements?.length || 0,
      nonFunctionalRequirements: project?.nonFunctionalRequirements?.length || 0,
      totalRequirements: (project?.functionalRequirements?.length || 0) + (project?.nonFunctionalRequirements?.length || 0)
    });
    
    // Log individual requirement statuses
    project?.functionalRequirements?.forEach((req, index) => {
      console.log(`Functional Requirement ${index + 1}: ${req.title} - Status: ${req.status}`);
    });
    
    project?.nonFunctionalRequirements?.forEach((req, index) => {
      console.log(`Non-Functional Requirement ${index + 1}: ${req.title} - Status: ${req.status}`);
    });
    
    // Check if project Foundations page is receiving updates
    const hasAnyReview = project?.functionalRequirements?.some(req => req.status === 'review') ||
                       project?.nonFunctionalRequirements?.some(req => req.status === 'review');
    console.log('=== HAS ANY REVIEW REQUIREMENTS ===', hasAnyReview);
    console.log('=== END PROJECT FOUNDATIONS PAGE DEBUG ===');
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
            ? `/api/projects/${project._id}/requirements/:reqId`
            : `/api/projects/${project._id}/non-functional-requirements/:reqId`);

      const method = modalState.mode === 'add' ? 'POST' : 'PUT';
      const url = modalState.mode === 'add' 
        ? `http://localhost:5000${endpoint}`
        : `http://localhost:5000${endpoint.replace(':reqId', requirement.id)}`;

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
    <section>
          <h1>Project Foundations</h1>
          <p className={styles.lead}>
            Define core requirements and scope before execution begins.
          </p>

          <div className={styles.block}>
            <h3>Project Overview</h3>
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

          <div className={styles.block}>
            <div className={styles.sectionHeader}>
              <h3>Functional Requirements</h3>
              {canEditRequirements(project) && (
                <button 
                  className={styles.addButton}
                  onClick={() => openModal('functional', 'add')}
                >
                  + Add Requirement
                </button>
              )}
            </div>
            <div className={styles.requirementsTable}>
              {(project.functionalRequirements?.length ?? 0) > 5 ? (
                <div className={styles.scrollableTable}>
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Requirement</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Tasks</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.functionalRequirements?.map((req) => (
                        <React.Fragment key={req.id}>
                          <tr>
                            <td>{req.id}</td>
                            <td>{req.title}</td>
                            <td>
                              <span className={`${styles.priority} ${styles[req.priority]}`}>
                                {req.priority}
                              </span>
                            </td>
                            <td>
                              <span className={`${styles.status} ${styles[req.status.replace('-', '')]}`}>
                                {req.status}
                              </span>
                            </td>
                            <td>
                              <div className={styles.tasksDropdown}>
                                <button 
                                  className={styles.dropdownButton}
                                  onClick={() => toggleRequirementTasks(req.id)}
                                >
                                  View Tasks {expandedRequirements.has(req.id) ? '▲' : '▼'}
                                </button>
                              </div>
                            </td>
                            <td>
                              {canEditRequirements(project) && (
                                <>
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
                                </>
                              )}
                            </td>
                          </tr>
                          {expandedRequirements.has(req.id) && (
                            <tr className={styles.tasksRow}>
                              <td colSpan={6}>
                                <div className={styles.tasksList}>
                                  {project.tasks
                                    ?.filter(task => task.linkedRequirement?.type === 'functional' && task.linkedRequirement?.id === req.id)
                                      .map(task => (
                                        <div key={task.id} className={styles.taskItem}>
                                          <div className={styles.taskInfo}>
                                            <span className={styles.taskTitle}>{task.title}</span>
                                            <span className={`${styles.taskStatus} ${styles[task.status.replace('-', '')]}`}>
                                              {task.status}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                  {(!project.tasks?.some(task => task.linkedRequirement?.type === 'functional' && task.linkedRequirement?.id === req.id)) && (
                                    <div className={styles.noTasks}>No tasks assigned</div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Requirement</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Tasks</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.functionalRequirements?.map((req) => (
                      <React.Fragment key={req.id}>
                        <tr>
                          <td>{req.id}</td>
                          <td>{req.title}</td>
                          <td>
                            <span className={`${styles.priority} ${styles[req.priority]}`}>
                              {req.priority}
                            </span>
                          </td>
                          <td>
                            <span className={`${styles.status} ${styles[req.status.replace('-', '')]}`}>
                              {req.status}
                            </span>
                          </td>
                          <td>
                            <div className={styles.tasksDropdown}>
                              <button 
                                className={styles.dropdownButton}
                                onClick={() => toggleRequirementTasks(req.id)}
                              >
                                View Tasks {expandedRequirements.has(req.id) ? '▲' : '▼'}
                              </button>
                            </div>
                          </td>
                          <td>
                            {canEditRequirements(project) && (
                              <>
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
                              </>
                            )}
                          </td>
                        </tr>
                        {expandedRequirements.has(req.id) && (
                          <tr className={styles.tasksRow}>
                            <td colSpan={6}>
                              <div className={styles.tasksList}>
                                {project.tasks
                                  ?.filter(task => task.linkedRequirement?.type === 'functional' && task.linkedRequirement?.id === req.id)
                                    .map(task => (
                                      <div key={task.id} className={styles.taskItem}>
                                        <div className={styles.taskInfo}>
                                          <span className={styles.taskTitle}>{task.title}</span>
                                          <span className={`${styles.taskStatus} ${styles[task.status.replace('-', '')]}`}>
                                            {task.status}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                {(!project.tasks?.some(task => task.linkedRequirement?.type === 'functional' && task.linkedRequirement?.id === req.id)) && (
                                  <div className={styles.noTasks}>No tasks assigned</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className={styles.block}>
            <div className={styles.sectionHeader}>
              <h3>Non-Functional Requirements</h3>
              {canEditRequirements(project) && (
                <button 
                  className={styles.addButton}
                  onClick={() => openModal('non-functional', 'add')}
                >
                  + Add Requirement
                </button>
              )}
            </div>
            <div className={styles.requirementsTable}>
              {(project.nonFunctionalRequirements?.length ?? 0) > 5 ? (
                <div className={styles.scrollableTable}>
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Category</th>
                        <th>Requirement</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Tasks</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.nonFunctionalRequirements?.map((req) => (
                        <React.Fragment key={req.id}>
                          <tr>
                            <td>{req.id}</td>
                            <td>
                              <span className={`${styles.category} ${styles[req.category]}`}>
                                {req.category}
                              </span>
                            </td>
                            <td>{req.title}</td>
                            <td>
                              <span className={`${styles.priority} ${styles[req.priority]}`}>
                                {req.priority}
                              </span>
                            </td>
                            <td>
                              <span className={`${styles.status} ${styles[req.status.replace('-', '')]}`}>
                                {req.status}
                              </span>
                            </td>
                            <td>
                              <div className={styles.tasksDropdown}>
                                <button 
                                  className={styles.dropdownButton}
                                  onClick={() => toggleRequirementTasks(req.id)}
                                >
                                  View Tasks {expandedRequirements.has(req.id) ? '▲' : '▼'}
                                </button>
                              </div>
                            </td>
                            <td>
                              {canEditRequirements(project) && (
                                <>
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
                                </>
                              )}
                            </td>
                          </tr>
                          {expandedRequirements.has(req.id) && (
                            <tr className={styles.tasksRow}>
                              <td colSpan={7}>
                                <div className={styles.tasksList}>
                                  {project.tasks
                                    ?.filter(task => task.linkedRequirement?.type === 'non-functional' && task.linkedRequirement?.id === req.id)
                                      .map(task => (
                                        <div key={task.id} className={styles.taskItem}>
                                          <div className={styles.taskInfo}>
                                            <span className={styles.taskTitle}>{task.title}</span>
                                            <span className={`${styles.taskStatus} ${styles[task.status.replace('-', '')]}`}>
                                              {task.status}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                  {(!project.tasks?.some(task => task.linkedRequirement?.type === 'non-functional' && task.linkedRequirement?.id === req.id)) && (
                                    <div className={styles.noTasks}>No tasks assigned</div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Category</th>
                      <th>Requirement</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Tasks</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.nonFunctionalRequirements?.map((req) => (
                      <React.Fragment key={req.id}>
                        <tr>
                          <td>{req.id}</td>
                          <td>
                            <span className={`${styles.category} ${styles[req.category]}`}>
                              {req.category}
                            </span>
                          </td>
                          <td>{req.title}</td>
                          <td>
                            <span className={`${styles.priority} ${styles[req.priority]}`}>
                              {req.priority}
                            </span>
                          </td>
                          <td>
                            <span className={`${styles.status} ${styles[req.status.replace('-', '')]}`}>
                              {req.status}
                            </span>
                          </td>
                          <td>
                            <div className={styles.tasksDropdown}>
                              <button 
                                className={styles.dropdownButton}
                                onClick={() => toggleRequirementTasks(req.id)}
                              >
                                View Tasks {expandedRequirements.has(req.id) ? '▲' : '▼'}
                              </button>
                            </div>
                          </td>
                          <td>
                            {canEditRequirements(project) && (
                              <>
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
                              </>
                            )}
                          </td>
                        </tr>
                        {expandedRequirements.has(req.id) && (
                          <tr className={styles.tasksRow}>
                            <td colSpan={7}>
                              <div className={styles.tasksList}>
                                {project.tasks
                                  ?.filter(task => task.linkedRequirement?.type === 'non-functional' && task.linkedRequirement?.id === req.id)
                                    .map(task => (
                                      <div key={task.id} className={styles.taskItem}>
                                        <div className={styles.taskInfo}>
                                          <span className={styles.taskTitle}>{task.title}</span>
                                          <span className={`${styles.taskStatus} ${styles[task.status.replace('-', '')]}`}>
                                            {task.status}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                {(!project.tasks?.some(task => task.linkedRequirement?.type === 'non-functional' && task.linkedRequirement?.id === req.id)) && (
                                  <div className={styles.noTasks}>No tasks assigned</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
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
    </section>
  );
};

export default ProjectFoundationsPage;
