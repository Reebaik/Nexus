import React, { useEffect, useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { TextField } from '@mui/material';
import styles from '../styles/ProjectPlanningPage.module.css';
import styles2 from '../styles/ProjectOverviewPage.module.css';
import KanbanBoard from '../components/KanbanBoard';
import GanttChart from '../components/GanttChart';
import MilestoneModal from '../components/MilestoneModal';
import type { ProjectOutletContext } from './ProjectLayout';
import { useUser } from '../contexts/UserContext';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  taskMembers?: string[];
  startDate: string;
  endDate: string;
  actualHours: number;
  dependencies: string[];
  linkedRequirement?: {
    type: 'functional' | 'non-functional';
    id: string;
  };
  updates: Array<{
    author: string;
    content: string;
    date: Date;
  }>;
  comments: Array<{
    author: string;
    content: string;
    date: Date;
  }>;
  lastUpdated: string;
}

interface Milestone {
  id: string;
  title: string;
  description?: string;
  date: Date | string;
  status: 'upcoming' | 'completed' | 'overdue';
  dependencies: string[];
}

const ProjectPlanningPage: React.FC = () => {
  const { project, setProject } = useOutletContext<ProjectOutletContext>();
  const { isProjectOwner } = useUser();
  const currentUserIsOwner = isProjectOwner(project);
  const [activePlanningView, setActivePlanningView] = useState<'kanban' | 'gantt' | 'milestones'>('kanban');
  const [taskModalState, setTaskModalState] = useState({
    isOpen: false,
    mode: 'add' as 'add' | 'edit',
    editingTask: null as Task | null
  });

  const tasks = (project.tasks || []) as Task[];
  const milestones = (project.milestones || []) as Milestone[];
  const [milestoneModalState, setMilestoneModalState] = useState({
    isOpen: false,
    mode: 'add' as 'add' | 'edit',
    editingMilestone: undefined as Milestone | undefined
  });

  // State for collapsible linked tasks
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

  // Toggle function for milestone expansion
  const toggleMilestoneExpansion = (milestoneId: string) => {
    setExpandedMilestones(prev => {
      const newSet = new Set(prev);
      if (newSet.has(milestoneId)) {
        newSet.delete(milestoneId);
      } else {
        newSet.add(milestoneId);
      }
      return newSet;
    });
  };

  // Member search state for task modal
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [filteredMembers, setFilteredMembers] = useState<string[]>([]);

  // Requirement search state for task modal
  const [requirementSearchQuery, setRequirementSearchQuery] = useState("");
  const [showRequirementDropdown, setShowRequirementDropdown] = useState(false);
  const [filteredRequirements, setFilteredRequirements] = useState<Array<{title: string, type: 'functional' | 'non-functional', id: string}>>([]);

  // Get all requirements from project (functional + non-functional)
  const allRequirements: Array<{title: string, type: 'functional' | 'non-functional', id: string}> = useMemo(() => [
    ...(project?.functionalRequirements || []).map(req => ({
      title: req.title,
      type: 'functional' as const,
      id: req.id
    })),
    ...(project?.nonFunctionalRequirements || []).map(req => ({
      title: req.title,
      type: 'non-functional' as const,
      id: req.id
    }))
  ], [project?.functionalRequirements, project?.nonFunctionalRequirements]);

  // Filter requirements based on search query
  useEffect(() => {
    if (requirementSearchQuery.trim() === '') {
      setFilteredRequirements(allRequirements);
    } else {
      const filtered = allRequirements.filter(req =>
        req.title.toLowerCase().includes(requirementSearchQuery.toLowerCase())
      );
      setFilteredRequirements(filtered);
    }
  }, [requirementSearchQuery, allRequirements]);

  const openMilestoneModal = (mode: 'add' | 'edit', milestone?: Milestone) => {
    setMilestoneModalState({
      isOpen: true,
      mode,
      editingMilestone: milestone || undefined
    });
  };

  const closeMilestoneModal = () => {
    setMilestoneModalState({
      isOpen: false,
      mode: 'add',
      editingMilestone: undefined
    });
  };

  const handleSaveMilestone = async (milestoneData: Partial<Milestone>) => {
    try {
      const token = localStorage.getItem('nexus_jwt');
      if (!token || !project._id) return;

      const url = milestoneModalState.mode === 'add' 
        ? `http://localhost:5000/api/projects/${project._id}/milestones`
        : `http://localhost:5000/api/projects/${project._id}/milestones/${milestoneModalState.editingMilestone?.id}`;

      const method = milestoneModalState.mode === 'add' ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(milestoneData)
      });

      if (response.ok) {
        // Refresh project data to update all pages
        try {
          const projectResponse = await fetch(`http://localhost:5000/api/projects/${project._id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (projectResponse.ok) {
            const data = await projectResponse.json();
            setProject(data.project);
            console.log('Project data refreshed across all pages');
          }
        } catch (refreshError) {
          console.error('Failed to refresh project data:', refreshError);
        }
        
        closeMilestoneModal();
        console.log('Milestone saved successfully');
      } else {
        const errorData = await response.json();
        console.error('Save milestone failed:', errorData);
      }
    } catch (error) {
      console.error('Error saving milestone:', error);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return;

    try {
      const token = localStorage.getItem('nexus_jwt');
      if (!token || !project._id) return;

      const response = await fetch(`http://localhost:5000/api/projects/${project._id}/milestones/${milestoneId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Refresh project data to update all pages
        try {
          const projectResponse = await fetch(`http://localhost:5000/api/projects/${project._id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (projectResponse.ok) {
            const data = await projectResponse.json();
            setProject(data.project);
            console.log('Project data refreshed across all pages');
          }
        } catch (refreshError) {
          console.error('Failed to refresh project data:', refreshError);
        }
        
        console.log('Milestone deleted successfully');
      } else {
        const errorData = await response.json();
        console.error('Delete milestone failed:', errorData);
      }
    } catch (error) {
      console.error('Error deleting milestone:', error);
    }
  };

  const openTaskModal = (mode: 'add' | 'edit', task?: Task) => {
    // Reset search state when opening modal
    setAssigneeSearchQuery("");
    setShowAssigneeDropdown(false);
    setFilteredMembers(project?.teamMembers || []);
    
    // Reset requirement search state
    setRequirementSearchQuery("");
    setShowRequirementDropdown(false);
    setFilteredRequirements([
      ...(project?.functionalRequirements || []).map(req => ({
        title: req.title,
        type: 'functional' as const,
        id: req.id
      })),
      ...(project?.nonFunctionalRequirements || []).map(req => ({
        title: req.title,
        type: 'non-functional' as const,
        id: req.id
      }))
    ]);
    
    setTaskModalState({
      isOpen: true,
      mode,
      editingTask: task || {
        id: '',
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        taskMembers: [],
        startDate: '',
        endDate: '',
        actualHours: 0,
        dependencies: [],
        linkedRequirement: undefined,
        updates: [],
        comments: [],
        lastUpdated: new Date().toISOString()
      }
    });
  };

  const closeTaskModal = () => {
    // Clear search state when closing modal
    setAssigneeSearchQuery("");
    setShowAssigneeDropdown(false);
    
    setTaskModalState({
      ...taskModalState,
      isOpen: false
    });
  };

  // Filter project members based on search query
  React.useEffect(() => {
    if (!project?.teamMembers) {
      setFilteredMembers([]);
      return;
    }

    if (!assigneeSearchQuery.trim()) {
      setFilteredMembers(project.teamMembers);
      return;
    }

    const filtered = project.teamMembers.filter(member =>
      member.toLowerCase().includes(assigneeSearchQuery.toLowerCase())
    );
    setFilteredMembers(filtered);
  }, [assigneeSearchQuery, project?.teamMembers]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (_event: MouseEvent) => {
      if (showAssigneeDropdown) {
        setShowAssigneeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAssigneeDropdown]);

  const handleAddTeamMember = (member: string) => {
    console.log('Adding team member:', member);
    console.log('Current editing task:', taskModalState.editingTask);
    
    if (!taskModalState.editingTask) {
      console.log('No editing task, creating new one');
      // Create a new editing task with the member
      setTaskModalState({
        ...taskModalState,
        editingTask: {
          id: '',
          title: '',
          description: '',
          status: 'todo',
          priority: 'medium',
          taskMembers: [member],
          startDate: '',
          endDate: '',
          actualHours: 0,
          dependencies: [],
          updates: [],
          comments: [],
          lastUpdated: new Date().toISOString()
        }
      });
      setAssigneeSearchQuery("");
      setShowAssigneeDropdown(false);
      return;
    }
    
    // Check if member already exists
    const existingMembers = taskModalState.editingTask.taskMembers || [];
    if (existingMembers.includes(member)) {
      console.log('Member already exists:', member);
      return;
    }

    // Add member to taskMembers array
    const updatedTask = {
      ...taskModalState.editingTask,
      taskMembers: [...existingMembers, member]
    };
    
    console.log('Updated task with member:', updatedTask);
    
    setTaskModalState({
      ...taskModalState,
      editingTask: updatedTask
    });
    
    setAssigneeSearchQuery("");
    setShowAssigneeDropdown(false);
  };

  const handleRemoveTeamMember = (memberToRemove: string) => {
    if (!taskModalState.editingTask) return;
    
    // Remove member from taskMembers array
    const updatedTask = {
      ...taskModalState.editingTask,
      taskMembers: (taskModalState.editingTask.taskMembers || []).filter(member => member !== memberToRemove)
    };
    
    setTaskModalState({
      ...taskModalState,
      editingTask: updatedTask
    });
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    console.log('Form data entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }
    
    const taskData: Task = {
      id: taskModalState.editingTask?.id || '',
      title: formData.get('title') as string || taskModalState.editingTask?.title || '',
      description: formData.get('description') as string || taskModalState.editingTask?.description || '',
      status: formData.get('status') as string || taskModalState.editingTask?.status || 'todo',
      priority: formData.get('priority') as string || taskModalState.editingTask?.priority || 'medium',
      taskMembers: taskModalState.editingTask?.taskMembers || [],
      startDate: taskModalState.editingTask?.startDate || '',
      endDate: taskModalState.editingTask?.endDate || '',
      actualHours: taskModalState.editingTask?.actualHours || 0,
      dependencies: taskModalState.editingTask?.dependencies || [],
      linkedRequirement: taskModalState.editingTask?.linkedRequirement, // Add linkedRequirement field
      updates: taskModalState.editingTask?.updates || [],
      comments: taskModalState.editingTask?.comments || [],
      lastUpdated: new Date().toISOString()
    };
    
    console.log('Constructed taskData:', taskData);
    
    try {
      const token = localStorage.getItem('nexus_jwt');
      if (!token || !project._id) {
        console.error('Missing token or project ID');
        return;
      }

      const url = taskModalState.mode === 'add' 
        ? `http://localhost:5000/api/projects/${project._id}/tasks`
        : `http://localhost:5000/api/projects/${project._id}/tasks/${taskData.id}`;

      const method = taskModalState.mode === 'add' ? 'POST' : 'PUT';
      
      console.log('Saving task:', { url, method, taskData });
      const backendTaskData = {
        id: taskData.id,
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        taskMembers: taskData.taskMembers || [],
        startDate: taskData.startDate,
        endDate: taskData.endDate,
        estimatedHours: taskModalState.editingTask?.actualHours || 0,
        actualHours: taskModalState.editingTask?.actualHours || 0,
        dependencies: taskData.dependencies || [],
        linkedRequirement: taskData.linkedRequirement
      };
    
    // Validate required fields
    if (!backendTaskData.title || backendTaskData.title.trim() === '') {
      console.error('Task title is required');
      alert('Task title is required');
      return;
    }
    
    console.log('Sending to backend:', backendTaskData);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(backendTaskData)
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        closeTaskModal();
        // Get the saved task data from backend response
        const savedTask = await response.json();
        console.log('Task saved successfully:', savedTask);
        console.log('Response structure:', JSON.stringify(savedTask, null, 2));
        
        // Handle different possible response structures
        let taskToUpdate;
        if (savedTask.task) {
          taskToUpdate = savedTask.task;
        } else if (savedTask.data) {
          taskToUpdate = savedTask.data;
        } else if (savedTask.updatedTask) {
          taskToUpdate = savedTask.updatedTask;
        } else {
          taskToUpdate = savedTask; // Assume the response itself is the task
        }
        
        const members =
          Array.isArray(taskToUpdate.taskMembers) && taskToUpdate.taskMembers.length > 0
            ? taskToUpdate.taskMembers
            : Array.isArray(taskToUpdate.teamMembers) && taskToUpdate.teamMembers.length > 0
            ? taskToUpdate.teamMembers
            : taskModalState.editingTask?.taskMembers || [];
        const mappedTask = {
          ...taskToUpdate,
          taskMembers: members,
          linkedRequirement: taskToUpdate.linkedRequirement || taskModalState.editingTask?.linkedRequirement,
          assignee: undefined,
          tags: undefined,
          startDate: undefined,
          createdAt: undefined,
          updatedAt: taskToUpdate.lastUpdated || taskToUpdate.updatedAt
        };
        
        console.log('Mapped task for frontend:', mappedTask);
        console.log('Original editing task taskMembers:', taskModalState.editingTask?.taskMembers);
        console.log('Backend response taskMembers:', taskToUpdate.taskMembers);
        console.log('Backend response assignee:', taskToUpdate.assignee);
        
        // Update local project state with the backend response
        if (taskModalState.mode === 'add') {
          // For new tasks, add the backend response to the project tasks array
          setProject(prev => {
            if (!prev) return prev;
            const updatedTasks = [...(prev.tasks || []), mappedTask];
            console.log('Updated tasks array (add):', updatedTasks);
            return {
              ...prev,
              tasks: updatedTasks
            };
          });
        } else {
          // For existing tasks, update in the project tasks array with backend response
          setProject(prev => {
            if (!prev) return prev;
            const updatedTasks = (prev.tasks || []).map(task => 
              task.id === mappedTask.id ? mappedTask : task
            );
            console.log('Updated tasks array (edit):', updatedTasks);
            return {
              ...prev,
              tasks: updatedTasks
            };
          });
        }
      } else {
        const errorData = await response.json();
        console.error('Save task failed:', errorData);
      }
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    console.log('Updating task:', taskId, updates);
    
    try {
      const token = localStorage.getItem('nexus_jwt');
      if (!token || !project._id) {
        console.error('No token or project ID found');
        return;
      }

      console.log('Making API call to:', `http://localhost:5000/api/projects/${project._id}/tasks/${taskId}`);
      console.log('Request body:', JSON.stringify({
        ...updates,
        updatedAt: new Date().toISOString()
      }, null, 2));

      const response = await fetch(`http://localhost:5000/api/projects/${project._id}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...updates,
          updatedAt: new Date().toISOString()
        })
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        // Update project tasks
        setProject((prev: any) => {
          if (!prev || !prev.tasks) return prev;
          return {
            ...prev,
            tasks: prev.tasks.map((t: any) => (t.id === taskId ? { ...t, ...updates } : t))
          };
        });
        
        // Refresh project data to update all pages
        try {
          const projectResponse = await fetch(`http://localhost:5000/api/projects/${project._id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (projectResponse.ok) {
            const data = await projectResponse.json();
            setProject(data.project);
            console.log('Project data refreshed across all pages');
          }
        } catch (refreshError) {
          console.error('Failed to refresh project data:', refreshError);
        }
        
        console.log('Task updated successfully');
      } else {
        const errorData = await response.json();
        console.error('Update task failed:', errorData);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    console.log('Deleting task:', taskId);
    
    try {
      const token = localStorage.getItem('nexus_jwt');
      if (!token || !project._id) {
        console.error('No token or project ID found');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/projects/${project._id}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update project tasks
        setProject((prev: any) => {
          if (!prev || !prev.tasks) return prev;
          return {
            ...prev,
            tasks: prev.tasks.filter((t: any) => t.id !== taskId)
          };
        });
        
        // Refresh project data to update all pages
        try {
          const projectResponse = await fetch(`http://localhost:5000/api/projects/${project._id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (projectResponse.ok) {
            const data = await projectResponse.json();
            setProject(data.project);
            console.log('Project data refreshed across all pages');
          }
        } catch (refreshError) {
          console.error('Failed to refresh project data:', refreshError);
        }
        
        console.log('Task deleted successfully');
      } else {
        const errorData = await response.json();
        console.error('Delete task failed:', errorData);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  return (
    <section>
      <div className={styles.planningHeader}>
        <div>
          <h1>Planning</h1>
          <p className={styles.lead}>Visualize how work connects before it starts.</p>
        </div>
        {currentUserIsOwner && (
          <>
            <button className={styles.addButton} onClick={() => openTaskModal('add')}>
              + Add Task
            </button>
            <button className={styles.addButton} onClick={() => openMilestoneModal('add')}>
              + Add Milestone
            </button>
          </>
        )}
      </div>

      <div className={styles.planningTabs}>
        <button
          className={`${styles.tabButton} ${activePlanningView === 'kanban' ? styles.active : ''}`}
          onClick={() => setActivePlanningView('kanban')}
        >
          Kanban Board
        </button>
        <button
          className={`${styles.tabButton} ${activePlanningView === 'gantt' ? styles.active : ''}`}
          onClick={() => setActivePlanningView('gantt')}
        >
          Gantt Chart
        </button>
        <button
          className={`${styles.tabButton} ${activePlanningView === 'milestones' ? styles.active : ''}`}
          onClick={() => setActivePlanningView('milestones')}
        >
          Milestones
        </button>
      </div>

      <div className={styles.planningContent}>
        {activePlanningView === 'kanban' && (
          <KanbanBoard
            tasks={tasks as any}
            onTaskUpdate={handleUpdateTask as any}
            onTaskDelete={handleDeleteTask as any}
            isProjectOwner={currentUserIsOwner}
          />
        )}
        {activePlanningView === 'gantt' && (
          <GanttChart
            tasks={tasks as any}
            milestones={milestones as any}
          />
        )}
        {activePlanningView === 'milestones' && (
          <div className={styles.milestonesView}>
            <div className={styles.milestonesGrid}>
              {milestones.map(milestone => {
                const milestoneTasks = tasks.filter(task => 
                  milestone.dependencies && milestone.dependencies.includes(task.id)
                ) || [];
                const completedTasks = milestoneTasks.filter(task => task.status === 'done');
                const progress = milestoneTasks.length > 0 ? 
                  Math.round((completedTasks.length / milestoneTasks.length) * 100) : 0;

                console.log(`Planning - Milestone: ${milestone.title}`);
                console.log('Dependencies:', milestone.dependencies);
                console.log('Milestone Tasks:', milestoneTasks.map(t => ({ id: t.id, title: t.title, status: t.status })));
                console.log(`Planning Progress: ${completedTasks.length}/${milestoneTasks.length} = ${progress}%`);

                return (
                  <div key={milestone.id} className={styles.milestoneCard}>
                    <div className={styles.milestoneHeader}>
                      <h3>{milestone.title}</h3>
                      <div className={styles.milestoneActions}>
                        <button 
                          className={styles.editButton}
                          onClick={() => openMilestoneModal('edit', milestone)}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className={styles.deleteButton}
                          onClick={() => handleDeleteMilestone(milestone.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {milestone.description && (
                      <p className={styles.milestoneDescription}>{milestone.description}</p>
                    )}
                    <div className={styles.milestoneMeta}>
                      <span>📅 {new Date(milestone.date).toLocaleDateString()}</span>
                      <span 
                        className={styles.taskCount}
                        onClick={() => toggleMilestoneExpansion(milestone.id)}
                      >
                        📋 {milestoneTasks.length} linked tasks {expandedMilestones.has(milestone.id) ? '▼' : '▶'}
                      </span>
                      <span>✅ {progress}% complete</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div 
                        className={styles.progressFill}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {milestoneTasks.length > 0 && (
                      <div className={`${styles.linkedTasks} ${expandedMilestones.has(milestone.id) ? styles.expanded : styles.collapsed}`}>
                        <h4>Linked Tasks:</h4>
                        {milestoneTasks.map(task => (
                          <div key={task.id} className={styles.taskItem}>
                            <span className={`${styles.statusIndicator} ${styles[task.status]}`}>
                              {task.status === 'done' ? '✅' : task.status === 'in-progress' ? '🔄' : task.status === 'blocked' ? '🚫' : '⭕'}
                            </span>
                            <span>{task.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {milestones.length === 0 && (
                <div className={styles.emptyState}>
                  <h3>No milestones yet</h3>
                  <p>Create your first milestone to track key project checkpoints</p>
                  <button 
                    className={styles.addButton}
                    onClick={() => openMilestoneModal('add')}
                  >
                    + Add First Milestone
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task Modal */}
      {taskModalState.isOpen && (
        <div className={styles2.modalOverlay}>
          <div className={styles2.modal}>
            <div className={styles2.modalHeader}>
              <h2>
                {taskModalState.mode === 'add' ? 'Add' : 'Edit'} Task
              </h2>
              <button onClick={closeTaskModal} className={styles2.closeButton}>×</button>
            </div>
            <div className={styles2.modalContent}>
              <form onSubmit={handleSaveTask}>
                <div className={styles2.formGroup}>
                  <label>Task Title</label>
                  <input 
                    type="text" 
                    name="title"
                    defaultValue={taskModalState.editingTask?.title || ''}
                    required
                  />
                </div>
                <div className={styles2.formGroup}>
                  <label>Description</label>
                  <textarea 
                    name="description"
                    defaultValue={taskModalState.editingTask?.description || ''}
                    rows={3}
                  />
                </div>
                <div className={styles2.formGroup}>
                  <label>Priority</label>
                  <select 
                    name="priority"
                    defaultValue={taskModalState.editingTask?.priority || 'medium'}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className={styles2.formGroup}>
                  <label>Status</label>
                  <select 
                    name="status"
                    defaultValue={taskModalState.editingTask?.status || 'todo'}
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className={styles2.formGroup}>
                  <label>Task Team Members</label>
                  <div className={styles2.assigneeInput}>
                    <input 
                      type="text"
                      value={assigneeSearchQuery}
                      onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                      onFocus={() => setShowAssigneeDropdown(true)}
                      placeholder="Add team members..."
                      className={styles2.assigneeSearchInput}
                    />
                    {showAssigneeDropdown && (
                      <div className={styles2.assigneeDropdown}>
                        {filteredMembers.length > 0 ? (
                          filteredMembers.map((member, index) => (
                            <div
                              key={index}
                              className={styles2.assigneeOption}
                              onMouseDown={() => handleAddTeamMember(member)}
                            >
                              {member}
                            </div>
                          ))
                        ) : (
                          <div className={styles2.noMembers}>
                            {project?.teamMembers?.length === 0 ? "No team members" : "No matching members"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Task Members Display */}
                  <div className={styles2.taskMembersList}>
                    {taskModalState.editingTask?.taskMembers?.map((member: string, index: number) => (
                      <div key={index} className={styles2.memberChip}>
                        <span>{member}</span>
                        <button
                          type="button"
                          className={styles2.removeMember}
                          onClick={() => handleRemoveTeamMember(member)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {(!taskModalState.editingTask?.taskMembers || taskModalState.editingTask.taskMembers.length === 0) && (
                      <div className={styles2.noMembers}>No team members assigned</div>
                    )}
                  </div>
                </div>
                <div className={styles2.formGroup}>
                  <label>Requirement</label>
                  <div className={styles2.assigneeInput}>
                    <input 
                      type="text"
                      value={requirementSearchQuery}
                      onChange={(e) => setRequirementSearchQuery(e.target.value)}
                      onFocus={() => setShowRequirementDropdown(true)}
                      placeholder="Assign to requirement..."
                      className={styles2.assigneeSearchInput}
                    />
                    {showRequirementDropdown && (
                      <div className={styles2.assigneeDropdown}>
                        {filteredRequirements.length > 0 ? (
                          filteredRequirements.map((requirement, index) => (
                            <div
                              key={index}
                              className={styles2.memberOption}
                              onClick={() => {
                                setTaskModalState({
                                  ...taskModalState,
                                  editingTask: {
                                    ...taskModalState.editingTask!,
                                    linkedRequirement: {
                                      type: requirement.type,
                                      id: requirement.id
                                    }
                                  }
                                });
                                setRequirementSearchQuery(requirement.title);
                                setShowRequirementDropdown(false);
                              }}
                            >
                              {requirement.title}
                            </div>
                          ))
                        ) : (
                          <div className={styles2.noMembers}>
                            {requirementSearchQuery ? "No matching requirements" : "Type to search requirements..."}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {taskModalState.editingTask?.linkedRequirement && (
                    <div className={styles2.selectedMembers}>
                      <span className={styles2.memberTag}>
                        {taskModalState.editingTask.linkedRequirement.type === 'functional' 
                          ? (project?.functionalRequirements?.find(req => req.id === taskModalState.editingTask?.linkedRequirement?.id)?.title || 'Unknown')
                          : (project?.nonFunctionalRequirements?.find(req => req.id === taskModalState.editingTask?.linkedRequirement?.id)?.title || 'Unknown')
                        }
                        <button
                          type="button"
                          onClick={() => {
                            setTaskModalState({
                              ...taskModalState,
                              editingTask: {
                                ...taskModalState.editingTask!,
                                linkedRequirement: undefined
                              }
                            });
                            setRequirementSearchQuery('');
                          }}
                          className={styles2.removeMember}
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  )}
                </div>
                <div className={styles2.formGroup}>
                  <TextField
                    fullWidth
                    label="Start Date"
                    type="date"
                    value={taskModalState.editingTask?.startDate ? 
                      (typeof taskModalState.editingTask.startDate === 'string' ? 
                        taskModalState.editingTask.startDate.split('T')[0] : 
                        new Date(taskModalState.editingTask.startDate).toISOString().split('T')[0]
                      ) : ''}
                    onChange={(e) => {
                      if (taskModalState.editingTask) {
                        setTaskModalState({
                          ...taskModalState,
                          editingTask: {
                            ...taskModalState.editingTask,
                            startDate: e.target.value
                          }
                        });
                      }
                    }}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      style: { cursor: 'pointer', backgroundColor: '#ffffff', color: '#111827' }
                    }}
                    sx={{
                      '& input[type="date"]::-webkit-calendar-picker-indicator': {
                        cursor: 'pointer',
                        opacity: 1,
                        filter: 'invert(0.5)'
                      }
                    }}
                  />
                </div>
                <div className={styles2.formGroup}>
                  <TextField
                    fullWidth
                    label="End Date"
                    type="date"
                    value={taskModalState.editingTask?.endDate ? 
                      (typeof taskModalState.editingTask.endDate === 'string' ? 
                        taskModalState.editingTask.endDate.split('T')[0] : 
                        new Date(taskModalState.editingTask.endDate).toISOString().split('T')[0]
                      ) : ''}
                    onChange={(e) => {
                      if (taskModalState.editingTask) {
                        setTaskModalState({
                          ...taskModalState,
                          editingTask: {
                            ...taskModalState.editingTask,
                            endDate: e.target.value
                          }
                        });
                      }
                    }}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      style: { cursor: 'pointer', backgroundColor: '#ffffff', color: '#111827' }
                    }}
                    sx={{
                      '& input[type="date"]::-webkit-calendar-picker-indicator': {
                        cursor: 'pointer',
                        opacity: 1,
                        filter: 'invert(0.5)'
                      }
                    }}
                  />
                </div>
                <div className={styles2.formActions}>
                  <button type="button" onClick={closeTaskModal}>Cancel</button>
                  <button type="submit">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <MilestoneModal
        isOpen={milestoneModalState.isOpen}
        onClose={closeMilestoneModal}
        onSave={handleSaveMilestone}
        milestone={milestoneModalState.editingMilestone}
        availableTasks={tasks as any}
        mode={milestoneModalState.mode}
      />
    </section>
  );
};

export default ProjectPlanningPage;
