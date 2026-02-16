import eventBus from '../events/eventBus.js';
import slackService from '../services/slackService.js';

function taskIdsForMilestone(milestone) {
  return Array.isArray(milestone.dependencies) ? milestone.dependencies : [];
}

function computeMilestoneProgress(project, milestone) {
  const ids = taskIdsForMilestone(milestone);
  if (!ids.length || !Array.isArray(project.tasks)) return 0;
  const linked = project.tasks.filter(t => ids.includes(t.id));
  if (linked.length === 0) return 0;
  const done = linked.filter(t => t.status === 'done').length;
  return Math.round((done / linked.length) * 100);
}

function checkMilestoneRisk(project, milestone) {
  const progress = computeMilestoneProgress(project, milestone);
  const due = milestone.date ? new Date(milestone.date) : null;
  const now = new Date();
  if (due && progress < 100 && due.getTime() < now.getTime()) {
    slackService.notifyProjectRisk(project, milestone, 100, progress, 'Overdue');
    return;
  }
  if (!due) return;
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((due.getTime() - now.getTime()) / msPerDay);
  if (daysLeft <= 7 && progress < 60) {
    slackService.notifyProjectRisk(project, milestone, 60, progress, 'At Risk');
  } else if (daysLeft <= 14 && progress < 40) {
    slackService.notifyProjectRisk(project, milestone, 40, progress, 'At Risk');
  }
}

eventBus.on('project.created', ({ project, creator }) => {
  slackService.notifyProjectCreated(project, creator);
});

eventBus.on('team.member.added', ({ project, member, addedBy }) => {
  slackService.notifyTeamMemberAdded(project, member, addedBy);
});

eventBus.on('task.created', ({ project, task, creator }) => {
  slackService.notifyTaskCreated(project, task, creator);
  if (Array.isArray(task.taskMembers)) {
    task.taskMembers.forEach(member => {
      slackService.notifyTaskAssigned(project, task, member, creator);
    });
  }
  if (Array.isArray(project.milestones)) {
    project.milestones.forEach(m => checkMilestoneRisk(project, m));
  }
});

eventBus.on('task.updated', ({ project, task, updater, changes }) => {
  slackService.notifyTaskUpdated(project, task, updater, changes);
  if (Array.isArray(project.milestones)) {
    const affected = project.milestones.filter(m => taskIdsForMilestone(m).includes(task.id));
    affected.forEach(m => checkMilestoneRisk(project, m));
  }
});

eventBus.on('task.completed', ({ project, task, completedBy }) => {
  slackService.notifyTaskCompleted(project, task, completedBy);
  if (Array.isArray(project.milestones)) {
    const affected = project.milestones.filter(m => taskIdsForMilestone(m).includes(task.id));
    affected.forEach(m => checkMilestoneRisk(project, m));
  }
});

eventBus.on('task.assigned', ({ project, task, assignee, assignedBy }) => {
  slackService.notifyTaskAssigned(project, task, assignee, assignedBy);
});

eventBus.on('task.commented', ({ project, task, comment, author }) => {
  slackService.notifyTaskComment(project, task, comment, author);
});

eventBus.on('milestone.created', ({ project, milestone, creator }) => {
  slackService.notifyMilestoneCreated(project, milestone, creator);
  checkMilestoneRisk(project, milestone);
});

eventBus.on('milestone.completed', ({ project, milestone, completedBy }) => {
  slackService.notifyMilestoneCompleted(project, milestone, completedBy);
});

eventBus.on('milestone.updated', ({ project, milestone }) => {
  checkMilestoneRisk(project, milestone);
});
