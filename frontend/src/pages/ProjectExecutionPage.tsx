import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { TextField } from '@mui/material';
import { DatePicker, ConfigProvider, theme } from 'antd';
import dayjs from 'dayjs';
import styles from '../styles/ProjectOverviewPage.module.css';
import executionStyles from '../styles/ExecutionPage.module.css';
import modalStyles from '../styles/ProjectPlanningPage.module.css';
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

const ProjectExecutionPage: React.FC = () => {
  const { project, setProject } = useOutletContext<ProjectOutletContext>();
  const { isProjectOwner } = useUser();
  const currentUserIsOwner = isProjectOwner(project);
  const [taskModalState, setTaskModalState] = useState({
    isOpen: false,
    mode: 'add' as 'add' | 'edit',
    editingTask: null as Task | null
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<'comments' | 'updates'>('comments');
  
  // Member search state for task modal
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [filteredMembers, setFilteredMembers] = useState<string[]>([]);

  // Requirement search state for task modal
  const [requirementSearchQuery, setRequirementSearchQuery] = useState("");
  const [showRequirementDropdown, setShowRequirementDropdown] = useState(false);
  const [filteredRequirements, setFilteredRequirements] = useState<Array<{title: string, type: 'functional' | 'non-functional', id: string}>>([]);

  // Refs for dropdown containers
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const requirementDropdownRef = useRef<HTMLDivElement>(null);

  // Get all requirements from project (functional + non-functional)
  const allRequirements: Array<{title: string, type: 'functional' | 'non-functional', id: string}> = useMemo(() => [
    ...(project?.functionalRequirements || []).map((req: any) => ({
      title: req.title,
      type: 'functional' as const,
      id: req.id
    })),
    ...(project?.nonFunctionalRequirements || []).map((req: any) => ({
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

  // Click outside detection for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close assignee dropdown if clicking outside
      if (showAssigneeDropdown && assigneeDropdownRef.current && 
          !assigneeDropdownRef.current.contains(event.target as Node)) {
        setShowAssigneeDropdown(false);
      }
      
      // Close requirement dropdown if clicking outside
      if (showRequirementDropdown && requirementDropdownRef.current && 
          !requirementDropdownRef.current.contains(event.target as Node)) {
        setShowRequirementDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAssigneeDropdown, showRequirementDropdown]);

  const openTaskModal = (mode: 'add' | 'edit', task?: Task) => {
    // Reset search state when opening modal
    setAssigneeSearchQuery("");
    setShowAssigneeDropdown(false);
    
    const currentTaskMembers = task?.taskMembers || [];
    
    const availableMembers = project?.teamMembers?.filter(member => 
      !currentTaskMembers.includes(member)
    ) || [];
    
    // Set filtered members to available members (shows all initially)
    setFilteredMembers(availableMembers);
    
    // Reset requirement search state
    setRequirementSearchQuery("");
    setShowRequirementDropdown(false);
    setFilteredRequirements([
      ...(project?.functionalRequirements || []).map((req: any) => ({
        title: req.title,
        type: 'functional' as const,
        id: req.id
      })),
      ...(project?.nonFunctionalRequirements || []).map((req: any) => ({
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

  const selectTask = (task: Task) => {
    // If the clicked task is already selected, deselect it (toggle behavior)
    if (selectedTask?.id === task.id) {
      setSelectedTask(null);
    } else {
      setSelectedTask(task);
    }
  };

  // Filter project members based on search query - Show all members initially, then filter
  React.useEffect(() => {
    console.log('Search effect triggered:', {
      searchQuery: assigneeSearchQuery,
      teamMembers: project?.teamMembers,
      showDropdown: showAssigneeDropdown,
      currentTaskMembers: taskModalState.editingTask?.taskMembers
    });

    if (!project?.teamMembers) {
      console.log('No team members available');
      setFilteredMembers([]);
      return;
    }

    const currentTaskMembers = taskModalState.editingTask?.taskMembers || [];
    
    // Always show available members (exclude already added ones)
    const availableMembers = project.teamMembers.filter(member => 
      !currentTaskMembers.includes(member)
    );
    
    // If search query is empty, show all available members
    // If search query has text, filter available members
    const filtered = assigneeSearchQuery.trim() === '' 
      ? availableMembers
      : availableMembers.filter(member => 
          member.toLowerCase().includes(assigneeSearchQuery.toLowerCase())
        );
    
    console.log('Filtered members:', {
      query: assigneeSearchQuery,
      totalMembers: project.teamMembers.length,
      currentTaskMembers: currentTaskMembers,
      availableCount: availableMembers.length,
      filteredCount: filtered.length,
      filteredMembers: filtered
    });
    
    setFilteredMembers(filtered);
  }, [assigneeSearchQuery, project?.teamMembers, showAssigneeDropdown, taskModalState.editingTask?.taskMembers]);

  // Scroll to selected task
  useEffect(() => {
    if (selectedTask) {
      // Small delay to ensure the DOM has updated and the expansion animation has started
      setTimeout(() => {
        const element = document.getElementById(`task-row-${selectedTask.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [selectedTask]);

  const handleAddTeamMember = (member: string) => {
    console.log('=== ADDING TEAM MEMBER ===');
    console.log('Member to add:', member);
    
    if (!taskModalState.editingTask) {
      console.log('No editing task, creating new one with member');
      // Create a new editing task with member
      const newTask = {
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
        linkedRequirement: undefined,
        updates: [],
        comments: [],
        lastUpdated: new Date().toISOString()
      };
      
      console.log('Creating new task:', newTask);
      
      setTaskModalState({
        ...taskModalState,
        editingTask: newTask
      });
      
      // Clear search and close dropdown
      setAssigneeSearchQuery("");
      setShowAssigneeDropdown(false);
      return;
    }
    
    // Check if member already exists
    const existingMembers = taskModalState.editingTask.taskMembers || [];
    console.log('Existing members:', existingMembers);
    console.log('Member already exists:', existingMembers.includes(member));
    
    if (existingMembers.includes(member)) {
      console.log('Member already exists, not adding:', member);
      return;
    }

    // Add member to existing task
    const updatedTask = {
      ...taskModalState.editingTask,
      taskMembers: [...existingMembers, member]
    };
    
    console.log('Updated task with new member:', updatedTask);
    
    setTaskModalState({
      ...taskModalState,
      editingTask: updatedTask
    });
    
    // Clear search and close dropdown
    setAssigneeSearchQuery("");
    setShowAssigneeDropdown(false);
    
    console.log('=== MEMBER ADDED SUCCESSFULLY ===');
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

  const closeTaskModal = () => {
    // Clear search state when closing modal
    setAssigneeSearchQuery("");
    setShowAssigneeDropdown(false);
    
    setTaskModalState({
      ...taskModalState,
      isOpen: false
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const token = localStorage.getItem('nexus_jwt');
      if (!token || !project._id) {
        console.error('Missing token or project ID');
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
        // Remove task from local state
        setProject(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: (prev.tasks || []).filter(task => task.id !== taskId)
          };
        });
        
        // Close task details if the deleted task was selected
        if (selectedTask?.id === taskId) {
          setSelectedTask(null);
        }
        
        console.log('Task deleted successfully');
      } else {
        const errorData = await response.json();
        console.error('Delete task failed:', errorData);
        alert(`Failed to delete task: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('An unexpected error occurred while deleting the task.');
    }
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
      linkedRequirement: taskModalState.editingTask?.linkedRequirement, // Keep linkedRequirement object as-is
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
    
    console.log('=== DEBUGGING BACKEND SEND ===');
    console.log('taskData dates:', { startDate: taskData.startDate, endDate: taskData.endDate });
    console.log('backendTaskData dates:', { startDate: backendTaskData.startDate, endDate: backendTaskData.endDate });
    console.log('Full backendTaskData:', backendTaskData);
    
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
          startDate: taskToUpdate.startDate || taskModalState.editingTask?.startDate || '',
          endDate: taskToUpdate.endDate || taskModalState.editingTask?.endDate || '',
          linkedRequirement: taskToUpdate.linkedRequirement || taskModalState.editingTask?.linkedRequirement || '',
          assignee: undefined,
          tags: undefined,
          createdAt: undefined,
          updatedAt: taskToUpdate.lastUpdated || taskToUpdate.updatedAt,
          dueDate: undefined,
          estimatedHours: undefined
        };
        
        console.log('=== DEBUGGING BACKEND RESPONSE ===');
        console.log('Backend taskToUpdate:', taskToUpdate);
        console.log('Backend startDate field:', taskToUpdate.startDate);
        console.log('Backend endDate field:', taskToUpdate.endDate);
        console.log('Mapped task startDate:', mappedTask.startDate);
        console.log('Mapped task endDate:', mappedTask.endDate);
        console.log('Original editing task dates:', {
          startDate: taskModalState.editingTask?.startDate,
          endDate: taskModalState.editingTask?.endDate
        });
        
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
            const updatedTasks = (prev.tasks || []).map((task: any) => 
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

  const handleAddUpdate = async (taskId: string) => {
    const update = prompt('Add an update:');
    if (!update || !update.trim()) return;

    try {
      const token = localStorage.getItem('nexus_jwt');
      if (!token || !project._id) {
        console.error('No token or id found');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/projects/${project._id}/tasks/${taskId}/updates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          author: 'Current User',
          content: update.trim()
        })
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const errorData = await response.json();
        console.error('Add update failed:', errorData);
      }
    } catch (error) {
      console.error('Error adding update:', error);
    }
  };

  const handleAddComment = async (taskId: string) => {
    const comment = prompt('Add a comment:');
    if (!comment || !comment.trim()) return;

    try {
      const token = localStorage.getItem('nexus_jwt');
      if (!token || !project._id) {
        console.error('No token or id found');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/projects/${project._id}/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          author: 'Current User',
          content: comment.trim()
        })
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const errorData = await response.json();
        console.error('Add comment failed:', errorData);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  return (
    <>
      <div className={styles.bgWrapper}>
        <div className={styles.bgGradient} />
        <div className={styles.gridOverlay} />
      </div>

      <section className={executionStyles.executionContainer}>
          <div className={styles.overviewHeader}>
            <div>
              <h1>Execution</h1>
              <p className={styles.lead}>
                Real work happening with clear ownership and collaboration.
              </p>
            </div>
          </div>

          {/* Execution Metrics */}
          <div className={styles.executionMetrics}>
            <div className={styles.metricCard}>
              <div className={styles.metricValue}>
                {project.tasks?.filter(t => t.status === 'done').length || 0}
              </div>
              <div className={styles.metricLabel}>Completed This Week</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricValue}>
                {project.tasks?.filter(t => t.status === 'in-progress').length || 0}
              </div>
              <div className={styles.metricLabel}>In Progress</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricValue}>
                {project.tasks?.filter(t => {
                  if (!t.endDate) return false;
                  const endDate = new Date(t.endDate);
                  return endDate < new Date() && t.status !== 'done';
                }).length || 0}
              </div>
              <div className={styles.metricLabel}>Overdue</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricValue}>
                {project.tasks?.filter(t => t.status === 'todo').length || 0}
              </div>
              <div className={styles.metricLabel}>To Do</div>
            </div>
          </div>

          {/* Two Column Layout with Expandable Details */}
          <div className={executionStyles.executionLayout}>
            {/* Left Column - Task List */}
            <div className={executionStyles.taskListColumn}>
              <div className={executionStyles.columnHeader}>
                <h3>Tasks</h3>
                {currentUserIsOwner && (
                  <button 
                    className={styles.addButton}
                    onClick={() => openTaskModal('add')}
                  >
                    + Add Task
                  </button>
                )}
              </div>
              
              <div className={executionStyles.taskTable}>
                <div className={executionStyles.tableHeader}>
                  <div>Task</div>
                  <div>Status</div>
                  <div>Assigned to</div>
                  <div>Due</div>
                  <div>Priority</div>
                </div>
                
                <div className={executionStyles.tableBody}>
                  {project.tasks?.map((task: Task) => (
                    <React.Fragment key={task.id}>
                      <div 
                        id={`task-row-${task.id}`}
                        className={`${executionStyles.taskRow} ${selectedTask?.id === task.id ? executionStyles.selected : ''}`}
                        onClick={() => selectTask(task)}
                      >
                        <div className={executionStyles.taskTitleCell}>
                          <span className={executionStyles.taskId}>{task.id}</span>
                          {task.title}
                        </div>
                        <div>
                          <span className={`${styles.status} ${styles[task.status.replace('-', '')]}`}>
                            {task.status}
                          </span>
                        </div>
                        <div>
                          {task.taskMembers && task.taskMembers.length > 0 ? (
                            <div className={styles.taskMembersList}>
                              {task.taskMembers.map((member: string, index: number) => (
                                <div key={index} className={styles.memberChip}>
                                  <span>{member}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className={styles.unassigned}>No Members Assigned</span>
                          )}
                        </div>
                        <div>
                          {task.endDate ? new Date(task.endDate).toLocaleDateString() : 'No end date'}
                        </div>
                        <div>
                          <span className={`${styles.priority} ${styles[task.priority]}`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Details Section */}
                      {selectedTask?.id === task.id && (
                        <div className={executionStyles.taskDetailsExpanded}>
                          <div className={executionStyles.taskDetailsInner}>
                            <div className={executionStyles.taskDetailsHeader}>
                              <h2>{task.title}</h2>
                              <div className={executionStyles.taskActions}>
                                <button 
                                  className={styles.editButton}
                                  onClick={() => openTaskModal('edit', task)}
                                >
                                  Edit
                                </button>
                                <button 
                                  className={styles.deleteButton}
                                  onClick={() => {
                                    if (confirm('Delete this task?')) {
                                      handleDeleteTask(task.id);
                                    }
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>

                            {/* Status and Assignment Controls - Read Only */}
                            <div className={executionStyles.taskControls}>
                              <div className={executionStyles.controlGroup}>
                                <label>Status</label>
                                <div className={`${styles.status} ${styles[task.status.replace('-', '')]}`}>
                                  {task.status}
                                </div>
                              </div>
                              
                              <div className={executionStyles.controlGroup}>
                                <label>Assigned To</label>
                                <div className={styles.taskMembersList}>
                                  {task.taskMembers && task.taskMembers.length > 0 ? (
                                    task.taskMembers.map((member: string, index: number) => (
                                      <div key={index} className={styles.memberChip}>
                                        <span>{member}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className={styles.noMembers}>No members assigned</div>
                                  )}
                                </div>
                              </div>
                              
                              <div className={executionStyles.controlGroup}>
                                <label>End Date</label>
                                <div className={executionStyles.readOnlyField}>
                                  {task.endDate ? new Date(task.endDate).toLocaleDateString() : 'No end date'}
                                </div>
                              </div>
                            </div>

                            {/* Description and Context */}
                            <div className={executionStyles.taskContext}>
                              <div className={executionStyles.contextSection}>
                                <h4>Description</h4>
                                <p>{task.description || 'No description provided'}</p>
                              </div>
                              
                              <div className={executionStyles.contextSection}>
                                <h4>Priority</h4>
                                <span className={`${styles.priority} ${styles[task.priority]}`}>
                                  {task.priority}
                                </span>
                              </div>
                            </div>

                            {/* Comments and Updates Tabs */}
                            <div className={executionStyles.taskDiscussion}>
                              <div className={executionStyles.discussionTabs}>
                                <button 
                                  className={`${executionStyles.tabButton} ${activeTab === 'comments' ? executionStyles.active : ''}`}
                                  onClick={() => setActiveTab('comments')}
                                >
                                  💬 Comments ({task.comments?.length || 0})
                                </button>
                                <button 
                                  className={`${executionStyles.tabButton} ${activeTab === 'updates' ? executionStyles.active : ''}`}
                                  onClick={() => setActiveTab('updates')}
                                >
                                  📝 Updates ({task.updates?.length || 0})
                                </button>
                              </div>
                              
                              <div className={executionStyles.tabContent}>
                                {activeTab === 'comments' && (
                                  <div className={executionStyles.commentsSection}>
                                    <button 
                                      className={styles.addCommentButton}
                                      onClick={() => handleAddComment(task.id)}
                                    >
                                      + Add Comment
                                    </button>
                                    
                                    <div className={styles.discussionList}>
                                      {task.comments && task.comments.length > 0 ? (
                                        task.comments.map((comment, index) => (
                                          <div key={index} className={styles.comment}>
                                            <div className={styles.commentHeader}>
                                              <span className={styles.commentAuthor}>{comment.author}</span>
                                              <span className={styles.commentDate}>
                                                {new Date(comment.date).toLocaleDateString()}
                                              </span>
                                            </div>
                                            <div className={styles.commentContent}>{comment.content}</div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className={styles.noComments}>No comments yet</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {activeTab === 'updates' && (
                                  <div className={executionStyles.updatesSection}>
                                    <button 
                                      className={styles.addCommentButton}
                                      onClick={() => handleAddUpdate(task.id)}
                                    >
                                      + Add Update
                                    </button>
                                    
                                    <div className={styles.discussionList}>
                                      {task.updates && task.updates.length > 0 ? (
                                        task.updates.map((update, index) => (
                                          <div key={index} className={styles.comment}>
                                            <div className={styles.commentHeader}>
                                              <span className={styles.commentAuthor}>{update.author}</span>
                                              <span className={styles.commentDate}>
                                                {new Date(update.date).toLocaleDateString()}
                                              </span>
                                            </div>
                                            <div className={styles.commentContent}>{update.content}</div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className={styles.noComments}>No updates yet</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Activity Feed */}
            <div className={executionStyles.activityColumn}>
              <div className={executionStyles.columnHeader}>
                <h3>Project Activity</h3>
              </div>
              
              <div className={executionStyles.activityFeed}>
                <div className={executionStyles.activityItem}>
                  <div className={executionStyles.activityIcon}>📝</div>
                  <div className={executionStyles.activityContent}>
                    <div className={executionStyles.activityText}>Project execution started</div>
                    <div className={executionStyles.activityTime}>Just now</div>
                  </div>
                </div>
                
                {/* Sample activity items - would come from backend */}
                {project.tasks?.slice(-5).reverse().map((task: Task) => (
                  <div key={task.id} className={executionStyles.activityItem}>
                    <div className={executionStyles.activityIcon}>
                      {task.status === 'done' ? '✅' : task.status === 'in-progress' ? '🔄' : '📋'}
                    </div>
                    <div className={executionStyles.activityContent}>
                      <div className={executionStyles.activityText}>
                        {task.status === 'done' ? `Completed: ${task.title}` : 
                         task.status === 'in-progress' ? `Started: ${task.title}` : 
                         `Created: ${task.title}`}
                      </div>
                      <div className={executionStyles.activityTime}>
                        {task.lastUpdated ? new Date(task.lastUpdated).toLocaleDateString() : 'Recently'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
      {/* Task Modal */}
      {taskModalState.isOpen && (
        <div className={modalStyles.modalOverlay}>
          <div className={modalStyles.modal}>
            <div className={modalStyles.modalHeader}>
              <h2>
                {taskModalState.mode === 'add' ? 'Add' : 'Edit'} Task
              </h2>
              <button onClick={closeTaskModal} className={modalStyles.closeButton}>×</button>
            </div>
            <div className={modalStyles.modalContent}>
              <form onSubmit={handleSaveTask} className={modalStyles.modalForm}>
                <div className={modalStyles.formGroup}>
                  <label>Task Title *</label>
                  <input 
                    type="text" 
                    name="title"
                    defaultValue={taskModalState.editingTask?.title || ''}
                    required
                    className={modalStyles.formInput}
                    placeholder="Enter task title"
                  />
                </div>
                <div className={modalStyles.formGroup}>
                  <label>Description</label>
                  <textarea 
                    name="description"
                    defaultValue={taskModalState.editingTask?.description || ''}
                    rows={3}
                    className={modalStyles.formTextarea}
                    placeholder="Describe the task..."
                  />
                </div>
                <div className={modalStyles.formGroup}>
                  <label>Priority</label>
                  <select 
                    name="priority"
                    defaultValue={taskModalState.editingTask?.priority || 'medium'}
                    className={modalStyles.formSelect}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className={modalStyles.formGroup}>
                  <label>Status</label>
                  <select 
                    name="status"
                    defaultValue={taskModalState.editingTask?.status || 'todo'}
                    className={modalStyles.formSelect}
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className={modalStyles.formGroup}>
                  <label>Task Team Members</label>
                  <div className={modalStyles.assigneeInput} ref={assigneeDropdownRef}>
                    <input 
                      type="text"
                      value={assigneeSearchQuery}
                      onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                      onFocus={() => setShowAssigneeDropdown(true)}
                      placeholder="Add team members..."
                      className={modalStyles.assigneeSearchInput}
                    />
                    {showAssigneeDropdown && (
                      <div className={modalStyles.assigneeDropdown}>
                        {filteredMembers.length > 0 ? (
                          filteredMembers.map((member, index) => (
                            <div
                              key={`${member}-${index}`}
                              className={modalStyles.assigneeOption}
                              onMouseDown={() => handleAddTeamMember(member)}
                            >
                              {member}
                            </div>
                          ))
                        ) : (
                          <div className={modalStyles.noMembers}>
                            {assigneeSearchQuery ? "No matching members" : "Type to search members..."}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Task Members Display */}
                  <div className={modalStyles.taskMembersList}>
                    {taskModalState.editingTask?.taskMembers?.map((member: string, index: number) => (
                      <div key={index} className={modalStyles.memberChip}>
                        <span>{member}</span>
                        <button
                          type="button"
                          className={modalStyles.removeMember}
                          onClick={() => handleRemoveTeamMember(member)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {(!taskModalState.editingTask?.taskMembers || taskModalState.editingTask.taskMembers.length === 0) && (
                      <div className={modalStyles.noMembers}>No team members assigned</div>
                    )}
                  </div>
                </div>
                <div className={modalStyles.formGroup}>
                  <label>Requirement</label>
                  <div className={modalStyles.assigneeInput} ref={requirementDropdownRef}>
                    <input 
                      type="text"
                      value={requirementSearchQuery}
                      onChange={(e) => setRequirementSearchQuery(e.target.value)}
                      onFocus={() => setShowRequirementDropdown(true)}
                      placeholder="Assign to requirement..."
                      className={modalStyles.assigneeSearchInput}
                    />
                    {showRequirementDropdown && (
                      <div className={modalStyles.assigneeDropdown}>
                        {filteredRequirements.length > 0 ? (
                          filteredRequirements.map((requirement, index) => (
                            <div
                              key={index}
                              className={modalStyles.memberOption}
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
                          <div className={modalStyles.noMembers}>
                            {requirementSearchQuery ? "No matching requirements" : "Type to search requirements..."}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {taskModalState.editingTask?.linkedRequirement && (
                    <div className={modalStyles.selectedMembers}>
                      <span className={modalStyles.memberTag}>
                        {taskModalState.editingTask.linkedRequirement.type === 'functional' 
                          ? (project?.functionalRequirements?.find((req: any) => req.id === taskModalState.editingTask?.linkedRequirement?.id)?.title || 'Unknown')
                          : (project?.nonFunctionalRequirements?.find((req: any) => req.id === taskModalState.editingTask?.linkedRequirement?.id)?.title || 'Unknown')
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
                          className={modalStyles.removeMember}
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  )}
                </div>
                <div className={modalStyles.formGroup}>
                  <label>Start Date</label>
                  <div className={modalStyles.dateInputContainer}>
                    <ConfigProvider
                      theme={{
                        algorithm: theme.darkAlgorithm,
                        token: {
                          colorBgContainer: 'rgba(255, 255, 255, 0.05)',
                          colorBorder: 'rgba(255, 255, 255, 0.2)',
                          colorText: '#fff',
                          colorTextPlaceholder: 'rgba(255, 255, 255, 0.4)',
                        }
                      }}
                    >
                      <DatePicker
                        className={modalStyles.formInput}
                        value={taskModalState.editingTask?.startDate ? dayjs(taskModalState.editingTask.startDate) : null}
                        onChange={(date) => {
                          if (taskModalState.editingTask) {
                            setTaskModalState({
                              ...taskModalState,
                              editingTask: {
                                ...taskModalState.editingTask,
                                startDate: date ? date.format('YYYY-MM-DD') : ''
                              }
                            });
                          }
                        }}
                        style={{ 
                          width: '100%', 
                          padding: '14px 18px', 
                          background: 'rgba(255, 255, 255, 0.05)', 
                          border: '1px solid rgba(255, 255, 255, 0.2)', 
                          color: '#fff', 
                          height: '48px'
                        }}
                        format="YYYY-MM-DD"
                        placeholder="Select start date"
                        allowClear={false}
                        suffixIcon={<span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '1.2rem' }}>📅</span>}
                      />
                    </ConfigProvider>
                  </div>
                </div>
                <div className={modalStyles.formGroup}>
                  <label>End Date</label>
                  <div className={modalStyles.dateInputContainer}>
                    <ConfigProvider
                      theme={{
                        algorithm: theme.darkAlgorithm,
                        token: {
                          colorBgContainer: 'rgba(255, 255, 255, 0.05)',
                          colorBorder: 'rgba(255, 255, 255, 0.2)',
                          colorText: '#fff',
                          colorTextPlaceholder: 'rgba(255, 255, 255, 0.4)',
                        }
                      }}
                    >
                      <DatePicker
                        className={modalStyles.formInput}
                        value={taskModalState.editingTask?.endDate ? dayjs(taskModalState.editingTask.endDate) : null}
                        onChange={(date) => {
                          if (taskModalState.editingTask) {
                            setTaskModalState({
                              ...taskModalState,
                              editingTask: {
                                ...taskModalState.editingTask,
                                endDate: date ? date.format('YYYY-MM-DD') : ''
                              }
                            });
                          }
                        }}
                        style={{ 
                          width: '100%', 
                          padding: '14px 18px', 
                          background: 'rgba(255, 255, 255, 0.05)', 
                          border: '1px solid rgba(255, 255, 255, 0.2)', 
                          color: '#fff', 
                          height: '48px'
                        }}
                        format="YYYY-MM-DD"
                        placeholder="Select end date"
                        allowClear={false}
                        suffixIcon={<span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '1.2rem' }}>📅</span>}
                      />
                    </ConfigProvider>
                  </div>
                </div>

                <div className={modalStyles.modalActions}>
                  <button 
                    type="button" 
                    onClick={closeTaskModal}
                    className={modalStyles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={modalStyles.submitButton}
                  >
                    {taskModalState.mode === 'add' ? 'Add Task' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
    </>
  );
};

export default ProjectExecutionPage;
