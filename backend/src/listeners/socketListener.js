import eventBus from '../events/eventBus.js';
import { getIO } from '../socket.js';

const emitNotification = (title, message, type = 'info') => {
  try {
    const io = getIO();
    io.emit('notification', { title, message, type });
  } catch (err) {
    console.error('Socket emit error:', err);
  }
};

eventBus.on('project.created', ({ project, creator }) => {
  emitNotification(
    'New Project Created',
    `Project "${project.name}" was created by ${creator}`,
    'success'
  );
});

eventBus.on('team.member.added', ({ project, member, addedBy }) => {
  emitNotification(
    'Team Member Added',
    `${member} was added to project "${project.name}" by ${addedBy}`,
    'info'
  );
});

eventBus.on('task.created', ({ project, task, creator }) => {
  emitNotification(
    'New Task Created',
    `Task "${task.title}" was created in "${project.name}" by ${creator}`,
    'info'
  );
});

eventBus.on('task.updated', ({ project, task, updater }) => {
  emitNotification(
    'Task Updated',
    `Task "${task.title}" in "${project.name}" was updated by ${updater}`,
    'info'
  );
});

eventBus.on('task.completed', ({ project, task, completedBy }) => {
  emitNotification(
    'Task Completed',
    `Task "${task.title}" in "${project.name}" was completed by ${completedBy}`,
    'success'
  );
});

eventBus.on('task.assigned', ({ project, task, assignee, assignedBy }) => {
  emitNotification(
    'Task Assigned',
    `Task "${task.title}" in "${project.name}" was assigned to ${assignee} by ${assignedBy}`,
    'info'
  );
});

eventBus.on('task.commented', ({ project, task, author }) => {
  emitNotification(
    'New Comment',
    `${author} commented on task "${task.title}" in "${project.name}"`,
    'info'
  );
});

eventBus.on('milestone.created', ({ project, milestone, creator }) => {
  emitNotification(
    'Milestone Created',
    `Milestone "${milestone.title}" created in "${project.name}" by ${creator}`,
    'info'
  );
});

eventBus.on('milestone.completed', ({ project, milestone, completedBy }) => {
  emitNotification(
    'Milestone Completed',
    `Milestone "${milestone.title}" in "${project.name}" was completed by ${completedBy}`,
    'success'
  );
});

eventBus.on('milestone.updated', ({ project, milestone }) => {
  emitNotification(
    'Milestone Updated',
    `Milestone "${milestone.title}" in "${project.name}" was updated`,
    'info'
  );
});

eventBus.on('milestone.deleted', ({ project, milestoneId, deleter }) => {
  emitNotification(
    'Milestone Deleted',
    `A milestone in "${project.name}" was deleted by ${deleter}`,
    'warning'
  );
});

eventBus.on('task.deleted', ({ project, taskId, deleter }) => {
  emitNotification(
    'Task Deleted',
    `A task in "${project.name}" was deleted by ${deleter}`,
    'warning'
  );
});

eventBus.on('requirement.created', ({ project, requirement, creator }) => {
  emitNotification(
    'Requirement Added',
    `Requirement "${requirement.title}" added to "${project.name}" by ${creator}`,
    'info'
  );
});

eventBus.on('requirement.updated', ({ project, requirement, updater }) => {
  emitNotification(
    'Requirement Updated',
    `Requirement "${requirement.title}" in "${project.name}" was updated by ${updater}`,
    'info'
  );
});

eventBus.on('requirement.deleted', ({ project, requirementId, deleter }) => {
  emitNotification(
    'Requirement Deleted',
    `A requirement in "${project.name}" was deleted by ${deleter}`,
    'warning'
  );
});

eventBus.on('nfr.created', ({ project, requirement, creator }) => {
  emitNotification(
    'NFR Added',
    `Non-functional requirement "${requirement.title}" added to "${project.name}" by ${creator}`,
    'info'
  );
});

eventBus.on('nfr.updated', ({ project, requirement, updater }) => {
  emitNotification(
    'NFR Updated',
    `Non-functional requirement "${requirement.title}" in "${project.name}" was updated by ${updater}`,
    'info'
  );
});

eventBus.on('nfr.deleted', ({ project, requirementId, deleter }) => {
  emitNotification(
    'NFR Deleted',
    `A non-functional requirement in "${project.name}" was deleted by ${deleter}`,
    'warning'
  );
});
