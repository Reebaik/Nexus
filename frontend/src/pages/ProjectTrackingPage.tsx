import React, { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from '../styles/ProjectOverviewPage.module.css';
import chartStyles from '../styles/TrackingCharts.module.css';
import type { ProjectOutletContext } from './ProjectLayout';



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

const ProjectTrackingPage: React.FC = () => {
  const { project } = useOutletContext<ProjectOutletContext>();
  const tasks = (project.tasks ?? []) as Task[];

  // Add useEffect to ensure real-time updates when project data changes
  React.useEffect(() => {
    console.log('ProjectTrackingPage: Project data updated, recalculating charts');
    console.log('Current tasks:', tasks.length);
    console.log('Tasks by status:', {
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'done').length
    });
  }, [project.tasks, tasks.length]);

  const toDate = (value?: string | Date) => {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const today = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysBetween = (a: Date, b: Date) => Math.max(0, Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / (24 * 60 * 60 * 1000)));

  // Calculate burndown data using task start/end dates
  const burndownData = useMemo(() => {
    if (!tasks.length) return [];

    const startCandidates: Date[] = [];
    const endCandidates: Date[] = [];

    const projectStart = toDate(project.startDate);
    const projectEnd = toDate((project as any).targetEndDate);
    if (projectStart) startCandidates.push(projectStart);
    if (projectEnd) endCandidates.push(projectEnd);

    tasks.forEach(task => {
      const s = toDate(task.startDate as any);
      const e = toDate((task.endDate as any) || task.dueDate);
      if (s) startCandidates.push(s);
      if (e) endCandidates.push(e);
    });

    const startDate =
      startCandidates.length > 0
        ? new Date(Math.min(...startCandidates.map(d => d.getTime())))
        : today;
    const endDate =
      endCandidates.length > 0
        ? new Date(Math.max(...endCandidates.map(d => d.getTime())))
        : today;

    const totalDays = Math.max(1, daysBetween(startDate, endDate));

    const totalTasks = tasks.length;
    const data = [];

    for (let day = 0; day <= totalDays; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);

      const plannedCompleted = tasks.reduce((completed, task) => {
        const plannedEnd = toDate((task.endDate as any) || task.dueDate);
        return plannedEnd && startOfDay(plannedEnd).getTime() <= startOfDay(currentDate).getTime()
          ? completed + 1
          : completed;
      }, 0);

      const idealRemaining = Math.max(0, totalTasks - plannedCompleted);

      const actualCompleted = tasks.reduce((completed, task) => {
        if (task.status !== 'done') return completed;

        const completedAt = toDate(task.completedAt);
        const updatedAt = toDate(task.updatedAt);
        const end = toDate((task.endDate as any) || task.dueDate);
        const taskDate = completedAt || updatedAt || end;

        return taskDate && startOfDay(taskDate).getTime() <= startOfDay(currentDate).getTime()
          ? completed + 1
          : completed;
      }, 0);

      const remainingTasks = Math.max(0, totalTasks - actualCompleted);

      data.push({
        dayIndex: day + 1,
        date: currentDate.toLocaleDateString(),
        completed: actualCompleted,
        remaining: remainingTasks,
        ideal: idealRemaining,
        totalWork: totalTasks
      });
    }
    
    return data;
  }, [tasks, project.startDate, (project as any).targetEndDate]);

  // Calculate task distribution by status
  const tasksByStatus = useMemo(() => ({
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done').length
  }), [tasks]);



  return (
    <>
      <div className={styles.bgWrapper}>
        <div className={styles.bgGradient} />
        <div className={styles.gridOverlay} />
      </div>
      <section className={chartStyles.trackingContainer}>
          <div className={styles.overviewHeader}>
            <h1>Tracking & Control</h1>
            <p className={styles.lead}>
              Measure progress, track time, and identify risk early.
            </p>
          </div>

          {/* 1) Burndown Chart with Recharts */}
          <div className={`${chartStyles.chartBlock} ${chartStyles.burndownChart}`}>
            <div className={chartStyles.chartHeader}>
              <h2 className={chartStyles.chartTitle}>Burndown Chart</h2>
              <p className={chartStyles.chartSubtitle}>Track progress vs ideal timeline</p>
            </div>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={burndownData} margin={{ top: 16, right: 24, left: 40, bottom: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    stroke="#94a3b8"
                  />
                  <YAxis 
                    label={{ value: 'Tasks', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    stroke="#94a3b8"
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
                        const point = payload[0].payload as any;
                        return (
                          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#f1f5f9' }}>
                            <p style={{ margin: '0 0 8px 0', color: '#f1f5f9' }}><strong>Day {point.dayIndex} - {point.date}</strong></p>
                            <p style={{ margin: '4px 0', color: '#10b981' }}>✅ Completed Tasks: {point.completed}</p>
                            <p style={{ margin: '4px 0', color: '#3b82f6' }}>📊 Remaining Tasks: {point.remaining}</p>
                            <p style={{ margin: '4px 0', color: '#94a3b8' }}>🎯 Ideal Remaining: {point.ideal}</p>
                            <p style={{ margin: '4px 0', color: '#10b981', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>📈 Total Tasks: {point.totalWork}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    wrapperStyle={{
                      paddingTop: '20px',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#f1f5f9'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ideal" 
                    stroke="#9ca3af" 
                    strokeDasharray="5 5" 
                    name="Ideal Burndown"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Completed Tasks"
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="remaining" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    name="Remaining Tasks"
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalWork" 
                    stroke="#10b981" 
                    strokeWidth={1} 
                    strokeDasharray="2 2"
                    name="Total Work"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className={chartStyles.metricsGrid}>
              <div className={chartStyles.metricCard}>
                <div className={chartStyles.metricValue}>{tasks.length}</div>
                <div className={chartStyles.metricLabel}>Total Tasks</div>
              </div>
              <div className={chartStyles.metricCard}>
                <div className={chartStyles.metricValue}>{burndownData[burndownData.length - 1]?.completed || 0}</div>
                <div className={chartStyles.metricLabel}>Completed Tasks</div>
              </div>
              <div className={chartStyles.metricCard}>
                <div className={chartStyles.metricValue}>{burndownData[burndownData.length - 1]?.remaining || tasks.length}</div>
                <div className={chartStyles.metricLabel}>Remaining Tasks</div>
              </div>
              <div className={chartStyles.metricCard}>
                <div className={chartStyles.metricValue}>{tasksByStatus.blocked}</div>
                <div className={chartStyles.metricLabel}>Blocked Tasks</div>
              </div>
              <div className={chartStyles.metricCard}>
                <div className={chartStyles.metricValue}>{tasksByStatus.review}</div>
                <div className={chartStyles.metricLabel}>In Review</div>
              </div>
            </div>
          </div>

          {/* 2) Milestone Progress Tracking */}
          <div className={chartStyles.chartBlock}>
            <div className={chartStyles.chartHeader}>
              <h2 className={chartStyles.chartTitle}>Milestone Progress</h2>
              <p className={chartStyles.chartSubtitle}>Track key deliverables and deadlines</p>
            </div>
            <div className={chartStyles.milestoneGrid}>
              {project.milestones?.map(milestone => {
                // Calculate milestone progress based on linked tasks
                const milestoneTasks = tasks.filter(task => 
                  milestone.dependencies && milestone.dependencies.includes(task.id)
                ) || [];
                
                console.log(`Milestone: ${milestone.title}`);
                console.log('Dependencies:', milestone.dependencies);
                console.log('Milestone Tasks:', milestoneTasks.map(t => ({ id: t.id, title: t.title, status: t.status })));
                
                const completedTasks = milestoneTasks.filter(task => task.status === 'done');
                const inProgressTasks = milestoneTasks.filter(task => task.status === 'in-progress');
                const blockedTasks = milestoneTasks.filter(task => task.status === 'blocked');
                
                // Calculate progress percentage
                const progress = milestoneTasks.length > 0 ? 
                  Math.round((completedTasks.length / milestoneTasks.length) * 100) : 0;

                console.log(`Progress: ${completedTasks.length}/${milestoneTasks.length} = ${progress}%`);

                // Determine milestone status
                const due = toDate(milestone.date);
                const isCompleted = milestone.status === 'completed' || progress === 100;
                const isOverdue = due ? startOfDay(due).getTime() < startOfDay(today).getTime() : false;
                const dueSoon = due ? daysBetween(today, due) <= 7 : false;
                const status = isCompleted ? 'completed' : (isOverdue || (dueSoon && progress < 80)) ? 'atRisk' : 'onTrack';

                return (
                  <div key={milestone.id} className={`${chartStyles.milestoneCard} ${chartStyles[status]}`}>
                    <div className={chartStyles.milestoneHeader}>
                      <h3 className={chartStyles.milestoneTitle}>{milestone.title}</h3>
                      <div className={chartStyles.milestoneMeta}>
                        <span className={chartStyles.milestoneDate}>
                          📅 {new Date(milestone.date).toLocaleDateString()}
                        </span>
                        <span className={`${chartStyles.milestoneStatus} ${chartStyles[status]}`}>
                          {status === 'completed' ? '✅ Completed' : status === 'atRisk' ? '⚠️ At Risk' : '🟢 On Track'}
                        </span>
                      </div>
                    </div>
                    
                    {milestone.description && (
                      <p className={chartStyles.milestoneDescription}>{milestone.description}</p>
                    )}
                    
                    <div className={chartStyles.progressContainer}>
                      <div className={chartStyles.progressLabel}>
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className={chartStyles.progressBar}>
                        <div 
                          className={`${chartStyles.progressFill} ${chartStyles[status]}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className={chartStyles.progressText}>
                        {completedTasks.length} of {milestoneTasks.length} tasks complete
                      </div>
                    </div>
                    
                    {/* Task breakdown for milestone */}
                    <div className={chartStyles.taskBreakdown}>
                      <div className={chartStyles.taskStats}>
                        <span className={chartStyles.taskStat}>
                          ✅ {completedTasks.length} Complete
                        </span>
                        <span className={chartStyles.taskStat}>
                          🔄 {inProgressTasks.length} In Progress
                        </span>
                        <span className={chartStyles.taskStat}>
                          🚫 {blockedTasks.length} Blocked
                        </span>
                      </div>
                      <div className={chartStyles.taskStat}>
                        📋 {milestoneTasks.length} Total Tasks
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


    </section>
    </>
  );
};

export default ProjectTrackingPage;
