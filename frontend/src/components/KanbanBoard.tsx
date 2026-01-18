import React, { useState } from 'react';
import styles from './KanbanBoard.module.css';
import { useUser } from '../contexts/UserContext';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'blocked' | 'review' | 'done';
  priority: 'high' | 'medium' | 'low';
  taskMembers?: string[];
  assignee?: string; // Backend field
  tags?: string[]; // Backend field
  startDate?: any; // Backend field
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
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
  createdAt?: any; // Backend field
  updatedAt?: any; // Backend field
}

interface KanbanBoardProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  isProjectOwner: boolean;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onTaskUpdate, onTaskDelete, isProjectOwner }) => {
  const { getCurrentUsername } = useUser();
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const isUserAssignedToTask = (task: Task): boolean => {
    if (isProjectOwner) return true;
    const currentUsername = getCurrentUsername();
    return !!(task.taskMembers && task.taskMembers.includes(currentUsername));
  };

  // Map backend task structure to frontend structure
  const mappedTasks = tasks.map(task => {
    const members =
      (task as any).taskMembers && Array.isArray((task as any).taskMembers)
        ? (task as any).taskMembers
        : (task as any).teamMembers && Array.isArray((task as any).teamMembers)
        ? (task as any).teamMembers
        : [];

    return {
      ...task,
      // Ensure taskMembers is always an array
      taskMembers: members,
      // Remove old fields that frontend doesn't use
      assignee: undefined,
      tags: undefined,
      startDate: undefined,
      createdAt: undefined
    };
  });

  const columns = [
    { id: 'todo', title: 'To Do', color: '#6B7280' },
    { id: 'in-progress', title: 'In Progress', color: '#3B82F6' },
    { id: 'blocked', title: 'Blocked', color: '#EF4444' },
    { id: 'review', title: 'Review', color: '#F59E0B' },
    { id: 'done', title: 'Done', color: '#10B981' }
  ];

  const getTasksByStatus = (status: string) => {
    return mappedTasks.filter(task => task.status === status);
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedTask) {
      onTaskUpdate(draggedTask.id, { 
        status: newStatus as Task['status'],
        lastUpdated: new Date().toISOString()
      });
      setDraggedTask(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={styles.kanbanBoard}>
      <div className={styles.columns}>
        {columns.map(column => (
          <div
            key={column.id}
            className={styles.column}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className={styles.columnHeader} style={{ borderColor: column.color }}>
              <h3>{column.title}</h3>
              <span className={styles.taskCount}>{getTasksByStatus(column.id).length}</span>
            </div>
            <div className={styles.taskList}>
              {getTasksByStatus(column.id).map(task => (
                <div
                  key={task.id}
                  className={`${styles.taskCard} ${!isUserAssignedToTask(task) ? styles.unassignedTask : ''}`}
                  draggable={isUserAssignedToTask(task)}
                  onDragStart={(e) => handleDragStart(e, task)}
                  onClick={() => setSelectedTask(task)}
                >
                  <div className={styles.taskHeader}>
                    <span className={styles.taskId}>{task.id}</span>
                    <span 
                      className={styles.priority}
                      style={{ backgroundColor: getPriorityColor(task.priority) }}
                    >
                      {task.priority}
                    </span>
                  </div>
                  <h4 className={styles.taskTitle}>{task.title}</h4>
                  {task.description && (
                    <p className={styles.taskDescription}>{task.description}</p>
                  )}
                  <div className={styles.taskMeta}>
                    {task.taskMembers && task.taskMembers.length > 0 && (
                      <div className={styles.teamMembers}>
                        <span>👥</span> {task.taskMembers.join(', ')}
                      </div>
                    )}
                    {task.dueDate && (
                      <div className={styles.dueDate}>
                        <span>📅</span> {formatDate(task.dueDate)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedTask && (
        <div className={styles.taskModal} onClick={() => setSelectedTask(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{selectedTask.title}</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setSelectedTask(null)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.taskDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.label}>ID:</span>
                  <span>{selectedTask.id}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Status:</span>
                  <span className={styles.status} style={{ color: columns.find(c => c.id === selectedTask.status)?.color }}>
                    {columns.find(c => c.id === selectedTask.status)?.title}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Priority:</span>
                  <span className={styles.priority} style={{ backgroundColor: getPriorityColor(selectedTask.priority) }}>
                    {selectedTask.priority}
                  </span>
                </div>
                {selectedTask.taskMembers && selectedTask.taskMembers.length > 0 && (
                  <div className={styles.detailRow}>
                    <span className={styles.label}>Team Members:</span>
                    <span>{selectedTask.taskMembers.join(', ')}</span>
                  </div>
                )}
                {selectedTask.dueDate && (
                  <div className={styles.detailRow}>
                    <span className={styles.label}>Due Date:</span>
                    <span>{formatDate(selectedTask.dueDate)}</span>
                  </div>
                )}
                {selectedTask.estimatedHours && (
                  <div className={styles.detailRow}>
                    <span className={styles.label}>Estimated Hours:</span>
                    <span>{selectedTask.estimatedHours}h</span>
                  </div>
                )}
                {selectedTask.actualHours && (
                  <div className={styles.detailRow}>
                    <span className={styles.label}>Actual Hours:</span>
                    <span>{selectedTask.actualHours}h</span>
                  </div>
                )}
                {selectedTask.description && (
                  <div className={styles.detailRow}>
                    <span className={styles.label}>Description:</span>
                    <span>{selectedTask.description}</span>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.deleteButton}
                onClick={() => {
                  onTaskDelete(selectedTask.id);
                  setSelectedTask(null);
                }}
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;
