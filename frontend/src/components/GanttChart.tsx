import React, { useState, useMemo, useRef, useEffect } from 'react';
import styles from './GanttChart.module.css';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'high' | 'medium' | 'low';
  teamMembers?: string[];
  startDate?: Date;
  endDate?: Date;
  actualHours?: number;
  dependencies: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  // Progress calculation
  progress?: number; // 0-100 percentage
}

interface Milestone {
  id: string;
  title: string;
  description?: string;
  date: Date;
  status: 'upcoming' | 'completed' | 'overdue' | 'at-risk';
  dependencies: string[];
  // Health calculation
  health?: 'on-track' | 'at-risk' | 'delayed';
  progress?: number; // Based on linked tasks
}

interface GanttChartProps {
  tasks: Task[];
  milestones: Milestone[];
}

const GanttChart: React.FC<GanttChartProps> = ({ tasks, milestones }) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');

  const taskListRef = useRef<HTMLDivElement>(null);
  const timelineGridRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (timelineGridRef.current && taskListRef.current && headerRef.current) {
      taskListRef.current.scrollTop = timelineGridRef.current.scrollTop;
      headerRef.current.scrollLeft = timelineGridRef.current.scrollLeft;
    }
  };

  // Calculate date range
  const dateRange = useMemo(() => {
    const allDates = [
      ...tasks.map(t => t.startDate ? new Date(t.startDate) : null).filter(Boolean),
      ...tasks.map(t => t.endDate ? new Date(t.endDate) : null).filter(Boolean),
      ...milestones.map(m => new Date(m.date)),
      new Date() // Include today
    ].filter(Boolean) as Date[];

    if (allDates.length === 0) {
      const today = new Date();
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 3, 0)
      };
    }

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Add padding
    const start = new Date(minDate);
    start.setDate(start.getDate() - 7);
    
    const end = new Date(maxDate);
    end.setDate(end.getDate() + 7);

    return { start, end };
  }, [tasks, milestones]);

  // Generate date columns
  const dateColumns = useMemo(() => {
    const columns = [];
    const current = new Date(dateRange.start);
    
    // For week view, generate weekly columns
    if (viewMode === 'week') {
      while (current <= dateRange.end) {
        columns.push(new Date(current));
        current.setDate(current.getDate() + 7);
      }
    } 
    // For day view, generate daily columns
    else if (viewMode === 'day') {
      while (current <= dateRange.end) {
        columns.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    } 
    // For month view, generate monthly columns
    else {
      while (current <= dateRange.end) {
        columns.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
      }
    }
    
    return columns;
  }, [dateRange, viewMode]);

  // Calculate task progress based on status and hours
  const calculateTaskProgress = (task: Task): number => {
    if (task.status === 'done') return 100;
    if (task.status === 'todo') return 0;
    
    // Default progress for in-progress and review
    if (task.status === 'in-progress') return 50;
    if (task.status === 'review') return 85;
    
    return 0;
  };

  // Calculate milestone health based on linked tasks
  const calculateMilestoneHealth = (milestone: Milestone): 'on-track' | 'at-risk' | 'delayed' => {
    const linkedTasks = tasks.filter(task => 
      milestone.dependencies && milestone.dependencies.includes(task.id)
    );
    
    if (linkedTasks.length === 0) return 'on-track';
    
    const completedTasks = linkedTasks.filter(task => task.status === 'done');
    const progressPercentage = (completedTasks.length / linkedTasks.length) * 100;
    
    const milestoneDate = new Date(milestone.date);
    const today = new Date();
    const daysUntilMilestone = Math.ceil((milestoneDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Health logic
    if (daysUntilMilestone < 0 && progressPercentage < 100) return 'delayed';
    if (daysUntilMilestone <= 7 && progressPercentage < 80) return 'at-risk';
    if (progressPercentage >= 100) return 'on-track';
    
    return 'on-track';
  };

  // Calculate milestone progress
  const calculateMilestoneProgress = (milestone: Milestone): number => {
    const linkedTasks = tasks.filter(task => 
      milestone.dependencies && milestone.dependencies.includes(task.id)
    );
    
    if (linkedTasks.length === 0) return 0;
    
    const completedTasks = linkedTasks.filter(task => task.status === 'done');
    return Math.round((completedTasks.length / linkedTasks.length) * 100);
  };

  // Group tasks by milestones
  const groupedTasks = useMemo(() => {
    const groups: Array<{ milestone?: Milestone; tasks: Task[] }> = [];
    
    // Find tasks not assigned to any milestone
    const unassignedTasks = tasks.filter(task => 
      !milestones.some(milestone => 
        milestone.dependencies && milestone.dependencies.includes(task.id)
      )
    );
    
    // Add unassigned tasks group
    if (unassignedTasks.length > 0) {
      groups.push({
        milestone: undefined,
        tasks: unassignedTasks
      });
    }
    
    // Group tasks by milestones
    milestones.forEach(milestone => {
      const milestoneTasks = tasks.filter(task => 
        milestone.dependencies && milestone.dependencies.includes(task.id)
      );
      
      if (milestoneTasks.length > 0) {
        groups.push({
          milestone,
          tasks: milestoneTasks
        });
      }
    });
    
    return groups;
  }, [tasks, milestones]);

  // Calculate task position and width using precise dates
  const calculateTaskPosition = (task: Task) => {
    if (!task.startDate || !task.endDate) return null;

    const startDate = new Date(task.startDate);
    const endDate = new Date(task.endDate);
    const dateRangeStart = dateRange.start;
    const dateRangeEnd = dateRange.end;

    // Calculate total time span in days
    const totalDays = (dateRangeEnd.getTime() - dateRangeStart.getTime()) / (1000 * 60 * 60 * 24);
    
    // Calculate precise start offset and duration in days
    const startOffset = Math.max(0, (startDate.getTime() - dateRangeStart.getTime()) / (1000 * 60 * 60 * 24));
    const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Calculate position as percentage of total time span
    const left = (startOffset / totalDays) * 100;
    const width = (duration / totalDays) * 100;

    return { left: `${left}%`, width: `${width}%` };
  };

  // Calculate milestone position using precise dates
  const calculateMilestonePosition = (milestone: Milestone) => {
    const milestoneDate = new Date(milestone.date);
    const dateRangeStart = dateRange.start;
    const dateRangeEnd = dateRange.end;

    // Calculate total time span in days
    const totalDays = (dateRangeEnd.getTime() - dateRangeStart.getTime()) / (1000 * 60 * 60 * 24);
    
    // Calculate precise offset in days
    const startOffset = Math.max(0, (milestoneDate.getTime() - dateRangeStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate position as percentage of total time span
    const left = (startOffset / totalDays) * 100;

    return { left: `${left}%` };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return '#6B7280';
      case 'in-progress': return '#3B82F6';
      case 'review': return '#F59E0B';
      case 'done': return '#10B981';
      case 'upcoming': return '#8B5CF6';
      case 'completed': return '#10B981';
      case 'overdue': return '#EF4444';
      case 'at-risk': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getHealthColor = (health: 'on-track' | 'at-risk' | 'delayed') => {
    switch (health) {
      case 'on-track': return '#10B981';
      case 'at-risk': return '#F59E0B';
      case 'delayed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return '#10B981';
    if (progress >= 50) return '#3B82F6';
    if (progress >= 20) return '#F59E0B';
    return '#EF4444';
  };

  const formatHeaderDate = (date: Date) => {
    if (viewMode === 'day') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (viewMode === 'week') {
      const weekStart = new Date(date);
      const weekEnd = new Date(date);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
  };

  const handleTaskClick = (task: Task) => {
    // For now, just show task details. In future, could open edit modal
    console.log('Task clicked:', task);
    setSelectedTask(task);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Calculate min width for timeline
  const minWidthPerColumn = 60; // px
  const totalMinWidth = dateColumns.length * minWidthPerColumn;

  return (
    <div className={styles.ganttChart}>
      <div className={styles.chartHeader}>
        <div className={styles.headerLeft}>
          <h3>Project Timeline</h3>
          <div className={styles.viewControls}>
            <button
              className={`${styles.viewButton} ${viewMode === 'day' ? styles.active : ''}`}
              onClick={() => setViewMode('day')}
            >
              Day
            </button>
            <button
              className={`${styles.viewButton} ${viewMode === 'week' ? styles.active : ''}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
            <button
              className={`${styles.viewButton} ${viewMode === 'month' ? styles.active : ''}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
          </div>
        </div>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ backgroundColor: '#3B82F6' }}></div>
            <span>In Progress</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ backgroundColor: '#10B981' }}></div>
            <span>Completed</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ backgroundColor: '#8B5CF6' }}></div>
            <span>Milestone</span>
          </div>
          <div className={styles.legendSection}>
            <span className={styles.legendTitle}>Health:</span>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ backgroundColor: '#10B981' }}></div>
              <span>On Track</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ backgroundColor: '#F59E0B' }}></div>
              <span>At Risk</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ backgroundColor: '#EF4444' }}></div>
              <span>Delayed</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.chartContainer}>
        <div className={styles.taskList}>
          <div className={styles.taskHeader}>
            <div className={styles.taskName}>Task / Milestone</div>
            <div className={styles.taskAssignee}>Task Members</div>
            <div className={styles.taskDuration}>Due On</div>
          </div>
          
          <div className={styles.taskListContent} ref={taskListRef}>
            {groupedTasks.map((group, groupIndex) => (
              <React.Fragment key={groupIndex}>
                {/* Milestone row */}
                {group.milestone && (
                  <div className={styles.milestoneRow}>
                    <div className={styles.taskName}>
                      <div className={styles.taskInfo}>
                        <span className={styles.taskId}>{group.milestone.id}</span>
                        <span className={styles.taskTitle}>{group.milestone.title}</span>
                      </div>
                    </div>
                    <div className={styles.taskAssignee}>-</div>
                    <div className={styles.taskDuration}>
                      {new Date(group.milestone.date).toLocaleDateString()}
                    </div>
                  </div>
                )}
                
                {/* Tasks under this milestone */}
                {group.tasks.map(task => (
                  <div key={task.id} className={styles.taskRow}>
                    <div className={styles.taskName}>
                      <div className={styles.taskInfo}>
                        <span className={styles.taskId}>{task.id}</span>
                        <span className={styles.taskTitle}>{task.title}</span>
                      </div>
                    </div>
                    <div className={styles.taskAssignee}>
                      {task.teamMembers && task.teamMembers.length > 0 
                        ? task.teamMembers.join(', ')
                        : 'Unassigned'
                      }
                    </div>
                    <div className={styles.taskDuration}>
                      {task.endDate 
                        ? new Date(task.endDate).toLocaleDateString()
                        : 'No due date'
                      }
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className={styles.timeline}>
          <div 
            className={styles.dateHeader}
            ref={headerRef}
          >
            <div style={{ minWidth: `${totalMinWidth}px`, width: '100%', display: 'flex' }}>
              {dateColumns.map((date, index) => (
                <div
                  key={index}
                  className={`${styles.dateColumn} ${isToday(date) ? styles.today : ''}`}
                  style={{ width: `${100 / dateColumns.length}%` }}
                >
                  {formatHeaderDate(date)}
                </div>
              ))}
            </div>
          </div>

          <div 
            className={styles.timelineGrid} 
            ref={timelineGridRef}
            onScroll={handleScroll}
          >
            <div style={{ minWidth: `${totalMinWidth}px`, width: '100%' }}>
              {groupedTasks.map((group, groupIndex) => (
                <React.Fragment key={groupIndex}>
                  {/* Milestone marker */}
                  {group.milestone && (
                    <div className={styles.timelineRow}>
                      <div
                        className={styles.milestoneMarker}
                        style={{
                          ...calculateMilestonePosition(group.milestone),
                          cursor: 'pointer'
                        }}
                        title={`${group.milestone.title} - ${calculateMilestoneHealth(group.milestone)} (${calculateMilestoneProgress(group.milestone)}% complete)`}
                      >
                        {/* Milestone diamond with health color */}
                        <div 
                          className={styles.milestoneDiamond}
                          style={{ backgroundColor: getHealthColor(calculateMilestoneHealth(group.milestone)) }}
                        />
                        <span className={styles.milestoneLabel}>{group.milestone.title}</span>
                        {/* Progress indicator */}
                        <div className={styles.milestoneProgress}>
                          <div 
                            className={styles.milestoneProgressBar}
                            style={{ width: `${calculateMilestoneProgress(group.milestone)}%` }}
                          />
                          <span className={styles.milestoneProgressText}>{calculateMilestoneProgress(group.milestone)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Tasks under this milestone */}
                  {group.tasks.map(task => {
                    const position = calculateTaskPosition(task);
                    const progress = calculateTaskProgress(task);
                    
                    // Always render a row, even if no position (to match sidebar)
                    return (
                      <div key={task.id} className={styles.timelineRow}>
                        {position && (
                          <div
                            className={styles.taskBar}
                            style={{
                              ...position,
                              backgroundColor: getStatusColor(task.status),
                              cursor: 'pointer'
                            }}
                            onClick={() => handleTaskClick(task)}
                          >
                            {/* Progress bar background */}
                            <div className={styles.taskBarBackground}>
                              {/* Progress fill */}
                              <div 
                                className={styles.taskBarProgress}
                                style={{ 
                                  width: `${progress}%`,
                                  backgroundColor: getProgressColor(progress)
                                }}
                              />
                            </div>
                            <div className={styles.taskBarContent}>
                              <span className={styles.taskBarTitle}>{task.title}</span>
                              <span className={styles.taskBarDuration}>
                                {task.startDate && task.endDate 
                                  ? Math.ceil((new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24)) + ' days'
                                  : 'No dates'
                                }
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
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
                  <span className={styles.status} style={{ color: getStatusColor(selectedTask.status) }}>
                    {selectedTask.status}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Progress:</span>
                  <span className={styles.status} style={{ color: getProgressColor(calculateTaskProgress(selectedTask)) }}>
                    {calculateTaskProgress(selectedTask)}%
                  </span>
                </div>
                {selectedTask.startDate && (
                  <div className={styles.detailRow}>
                    <span className={styles.label}>Start Date:</span>
                    <span>{new Date(selectedTask.startDate).toLocaleDateString()}</span>
                  </div>
                )}
                {selectedTask.endDate && (
                  <div className={styles.detailRow}>
                    <span className={styles.label}>End Date:</span>
                    <span>{new Date(selectedTask.endDate).toLocaleDateString()}</span>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default GanttChart;