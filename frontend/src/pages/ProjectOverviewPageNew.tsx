import React from 'react';
import { useOutletContext } from 'react-router-dom';
import styles from '../styles/ProjectOverviewPage.module.css';
import type { ProjectOutletContext } from './ProjectLayout';

const ProjectOverviewPageNew: React.FC = () => {
  const { project } = useOutletContext<ProjectOutletContext>();

  const tasks = project.tasks || [];
  const milestones = project.milestones || [];
  const functionalRequirements = project.functionalRequirements || [];
  const nonFunctionalRequirements = project.nonFunctionalRequirements || [];

  // Calculate requirement statistics
  const requirementStats = {
    functional: {
      total: functionalRequirements.length,
      defined: functionalRequirements.filter(req => req.status === 'defined').length,
      inProgress: functionalRequirements.filter(req => req.status === 'in-progress').length,
      review: functionalRequirements.filter(req => req.status === 'review').length,
      verified: functionalRequirements.filter(req => req.status === 'verified').length,
    },
    nonFunctional: {
      total: nonFunctionalRequirements.length,
      defined: nonFunctionalRequirements.filter(req => req.status === 'defined').length,
      inProgress: nonFunctionalRequirements.filter(req => req.status === 'in-progress').length,
      review: nonFunctionalRequirements.filter(req => req.status === 'review').length,
      verified: nonFunctionalRequirements.filter(req => req.status === 'verified').length,
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'defined': return '#6b7280';
      case 'in-progress': return '#3b82f6';
      case 'review': return '#f59e0b';
      case 'verified': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <section className={styles.overviewContainer}>
      <div className={styles.overviewHeader}>
        <h1>{project.name}</h1>
        <p className={styles.lead}>{project.description}</p>
      </div>

      {/* Project Details */}
      <div className={styles.projectDetails}>
        <div className={styles.detailCard}>
          <h3>Objective</h3>
          <p>{project.objective}</p>
        </div>
        <div className={styles.detailCard}>
          <h3>Scope</h3>
          <p>{project.description || 'No scope defined'}</p>
        </div>
      </div>

      {/* Project Statistics */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📋</div>
          <div className={styles.statContent}>
            <h3>{tasks.length}</h3>
            <span>Total Tasks</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>✅</div>
          <div className={styles.statContent}>
            <h3>{tasks.filter((t: any) => t.status === 'done').length}</h3>
            <span>Completed</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🎯</div>
          <div className={styles.statContent}>
            <h3>{milestones.length}</h3>
            <span>Milestones</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📊</div>
          <div className={styles.statContent}>
            <h3>{Math.round(((tasks.filter((t: any) => t.status === 'done').length || 0) / (tasks.length || 1)) * 100)}%</h3>
            <span>Completion</span>
          </div>
        </div>
      </div>

      {/* Requirements Overview */}
      <div className={styles.requirementsSection}>
        <div className={styles.requirementsHeader}>
          <h2>Requirements Overview</h2>
          <div className={styles.requirementCounts}>
            <div className={styles.requirementCount}>
              <span className={styles.countLabel}>Functional</span>
              <span className={styles.countNumber}>{functionalRequirements.length}</span>
            </div>
            <div className={styles.requirementCount}>
              <span className={styles.countLabel}>Non-Functional</span>
              <span className={styles.countNumber}>{nonFunctionalRequirements.length}</span>
            </div>
          </div>
        </div>

        <div className={styles.requirementsGrid}>
          {/* Functional Requirements */}
          <div className={styles.requirementCategory}>
            <div className={styles.categoryHeader}>
              <h3>Functional Requirements</h3>
              <div className={styles.categoryStats}>
                <span className={styles.statBadge} style={{ backgroundColor: getStatusColor('defined') }}>
                  {requirementStats.functional.defined} Defined
                </span>
                <span className={styles.statBadge} style={{ backgroundColor: getStatusColor('in-progress') }}>
                  {requirementStats.functional.inProgress} In Progress
                </span>
                <span className={styles.statBadge} style={{ backgroundColor: getStatusColor('review') }}>
                  {requirementStats.functional.review} Review
                </span>
                <span className={styles.statBadge} style={{ backgroundColor: getStatusColor('verified') }}>
                  {requirementStats.functional.verified} Verified
                </span>
              </div>
            </div>
            <div className={styles.requirementsList}>
              {functionalRequirements.length > 5 ? (
                <div className={styles.scrollableRequirements}>
                  {functionalRequirements.map((req: any) => (
                    <div key={req.id} className={styles.requirementItem}>
                      <div className={styles.requirementHeader}>
                        <span className={styles.requirementId}>{req.id}</span>
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
                        <span className={styles.priority} style={{ 
                          backgroundColor: req.priority === 'high' ? '#ef4444' : 
                                         req.priority === 'medium' ? '#f59e0b' : '#10b981' 
                        }}>
                          {req.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {functionalRequirements.map((req: any) => (
                    <div key={req.id} className={styles.requirementItem}>
                      <div className={styles.requirementHeader}>
                        <span className={styles.requirementId}>{req.id}</span>
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
                        <span className={styles.priority} style={{ 
                          backgroundColor: req.priority === 'high' ? '#ef4444' : 
                                         req.priority === 'medium' ? '#f59e0b' : '#10b981' 
                        }}>
                          {req.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Non-Functional Requirements */}
          <div className={styles.requirementCategory}>
            <div className={styles.categoryHeader}>
              <h3>Non-Functional Requirements</h3>
              <div className={styles.categoryStats}>
                <span className={styles.statBadge} style={{ backgroundColor: getStatusColor('defined') }}>
                  {requirementStats.nonFunctional.defined} Defined
                </span>
                <span className={styles.statBadge} style={{ backgroundColor: getStatusColor('in-progress') }}>
                  {requirementStats.nonFunctional.inProgress} In Progress
                </span>
                <span className={styles.statBadge} style={{ backgroundColor: getStatusColor('review') }}>
                  {requirementStats.nonFunctional.review} Review
                </span>
                <span className={styles.statBadge} style={{ backgroundColor: getStatusColor('verified') }}>
                  {requirementStats.nonFunctional.verified} Verified
                </span>
              </div>
            </div>
            <div className={styles.requirementsList}>
              {nonFunctionalRequirements.length > 5 ? (
                <div className={styles.scrollableRequirements}>
                  {nonFunctionalRequirements.map((req: any) => (
                    <div key={req.id} className={styles.requirementItem}>
                      <div className={styles.requirementHeader}>
                        <span className={styles.requirementId}>{req.id}</span>
                        <span className={styles.requirementCategory}>{req.category}</span>
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
                        <span className={styles.priority} style={{ 
                          backgroundColor: req.priority === 'high' ? '#ef4444' : 
                                         req.priority === 'medium' ? '#f59e0b' : '#10b981' 
                        }}>
                          {req.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {nonFunctionalRequirements.map((req: any) => (
                    <div key={req.id} className={styles.requirementItem}>
                      <div className={styles.requirementHeader}>
                        <span className={styles.requirementId}>{req.id}</span>
                        <span className={styles.requirementCategory}>{req.category}</span>
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
                        <span className={styles.priority} style={{ 
                          backgroundColor: req.priority === 'high' ? '#ef4444' : 
                                         req.priority === 'medium' ? '#f59e0b' : '#10b981' 
                        }}>
                          {req.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Project Timeline */}
      <div className={styles.timelineSection}>
        <h2>Project Timeline</h2>
        <div className={styles.timelineGrid}>
          <div className={styles.timelineItem}>
            <span className={styles.timelineLabel}>Start Date</span>
            <span className={styles.timelineValue}>
              {new Date(project.startDate).toLocaleDateString()}
            </span>
          </div>
          <div className={styles.timelineItem}>
            <span className={styles.timelineLabel}>Target End</span>
            <span className={styles.timelineValue}>
              {new Date(project.targetEndDate).toLocaleDateString()}
            </span>
          </div>
          <div className={styles.timelineItem}>
            <span className={styles.timelineLabel}>Project Health</span>
            <span className={styles.timelineValue}>
              {(() => {
                const overdueTasks = tasks.filter((t: any) => {
                  if (!t.dueDate) return false;
                  return new Date(t.dueDate) < new Date() && t.status !== 'done';
                }).length;

                if (overdueTasks > 0) return '🔴 At Risk';
                if (overdueTasks === 0 && tasks.filter((t: any) => t.status === 'in-progress').length > 0) return '🟡 On Track';
                return '🟢 Healthy';
              })()}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProjectOverviewPageNew;
