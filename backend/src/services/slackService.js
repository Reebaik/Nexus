import { IncomingWebhook } from '@slack/webhook';

class SlackService {
  constructor() {
    console.log('🔍 SlackService initializing...');
    console.log('🔍 SLACK_WEBHOOK_URL from env:', process.env.SLACK_WEBHOOK_URL ? 'Found ✅' : 'Not found ❌');
    console.log('🔍 Full URL (first 50 chars):', process.env.SLACK_WEBHOOK_URL?.substring(0, 50));
    
    this.webhook = process.env.SLACK_WEBHOOK_URL 
      ? new IncomingWebhook(process.env.SLACK_WEBHOOK_URL)
      : null;
    this.enabled = !!this.webhook;
    
    console.log('🔍 Slack integration enabled:', this.enabled ? '✅ YES' : '❌ NO');
  }

  async sendNotification(message) {
    if (!this.enabled) {
      console.log('Slack notifications disabled (no webhook URL configured)');
      return;
    }

    try {
      await this.webhook.send(message);
      console.log('Slack notification sent successfully');
    } catch (error) {
      console.error('Error sending Slack notification:', error.message);
    }
  }

  baseUrl() {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  projectUrl(project) {
    const id = project && (project._id || project.id);
    return id ? `${this.baseUrl()}/projects/${id}/overview` : this.baseUrl();
  }

  taskUrl(project, task) {
    const id = project && (project._id || project.id);
    return id ? `${this.baseUrl()}/projects/${id}/planning` : this.baseUrl();
  }

  milestoneUrl(project, milestone) {
    const id = project && (project._id || project.id);
    return id ? `${this.baseUrl()}/projects/${id}/planning` : this.baseUrl();
  }

  viewActions(url, label = 'View in Nexus') {
    return {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: label
          },
          url
        }
      ]
    };
  }

  // Task notifications
  async notifyTaskCreated(project, task, creator) {
    const message = {
      text: `🆕 New Task Created`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🆕 New Task Created'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Project:*\n${project.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Task:*\n${task.title}`
            },
            {
              type: 'mrkdwn',
              text: `*Priority:*\n${this.priorityEmoji(task.priority)} ${task.priority.toUpperCase()}`
            },
            {
              type: 'mrkdwn',
              text: `*Created by:*\n${creator}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Description:*\n${task.description || '_No description provided_'}`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Assigned to: ${task.taskMembers?.join(', ') || 'Unassigned'}`
            }
          ]
        },
        this.viewActions(this.taskUrl(project, task), 'View Task')
      ]
    };

    await this.sendNotification(message);
  }

  async notifyTaskUpdated(project, task, updater, changes) {
    const changesList = Object.entries(changes)
      .map(([key, value]) => `• *${key}*: ${value}`)
      .join('\n');

    const message = {
      text: `✏️ Task Updated: ${task.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '✏️ Task Updated'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Project:*\n${project.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Task:*\n${task.title}`
            },
            {
              type: 'mrkdwn',
              text: `*Updated by:*\n${updater}`
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\n${this.statusEmoji(task.status)} ${task.status}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Changes:*\n${changesList}`
          }
        },
        this.viewActions(this.taskUrl(project, task), 'View Task')
      ]
    };

    await this.sendNotification(message);
  }

  async notifyTaskCompleted(project, task, completedBy) {
    const message = {
      text: `✅ Task Completed: ${task.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '✅ Task Completed!'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Project:*\n${project.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Task:*\n${task.title}`
            },
            {
              type: 'mrkdwn',
              text: `*Completed by:*\n${completedBy}`
            },
            {
              type: 'mrkdwn',
              text: `*Priority:*\n${this.priorityEmoji(task.priority)} ${task.priority.toUpperCase()}`
            }
          ]
        }
      ,
        this.viewActions(this.taskUrl(project, task), 'View Task')
      ]
    };

    await this.sendNotification(message);
  }

  async notifyTaskAssigned(project, task, assignee, assignedBy) {
    const message = {
      text: `👤 Task Assigned: ${task.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '👤 New Task Assignment'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Project:*\n${project.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Task:*\n${task.title}`
            },
            {
              type: 'mrkdwn',
              text: `*Assigned to:*\n${assignee}`
            },
            {
              type: 'mrkdwn',
              text: `*Assigned by:*\n${assignedBy}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Description:*\n${task.description || '_No description provided_'}`
          }
        },
        this.viewActions(this.taskUrl(project, task), 'View Task')
      ]
    };

    await this.sendNotification(message);
  }

  async notifyTaskComment(project, task, comment, author) {
    const message = {
      text: `💬 New Comment on: ${task.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '💬 New Comment'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Project:*\n${project.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Task:*\n${task.title}`
            },
            {
              type: 'mrkdwn',
              text: `*Author:*\n${author}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Comment:*\n_"${comment.content}"_`
          }
        },
        this.viewActions(this.taskUrl(project, task), 'View Task')
      ]
    };

    await this.sendNotification(message);
  }

  // Milestone notifications
  async notifyMilestoneCreated(project, milestone, creator) {
    const message = {
      text: `🎯 New Milestone: ${milestone.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎯 New Milestone Created'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Project:*\n${project.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Milestone:*\n${milestone.title}`
            },
            {
              type: 'mrkdwn',
              text: `*Target Date:*\n${new Date(milestone.date).toLocaleDateString()}`
            },
            {
              type: 'mrkdwn',
              text: `*Created by:*\n${creator}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Description:*\n${milestone.description || '_No description provided_'}`
          }
        },
        this.viewActions(this.milestoneUrl(project, milestone), 'View Milestone')
      ]
    };

    await this.sendNotification(message);
  }

  async notifyMilestoneCompleted(project, milestone, completedBy) {
    const message = {
      text: `🎉 Milestone Completed: ${milestone.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎉 Milestone Completed!'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Project:*\n${project.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Milestone:*\n${milestone.title}`
            },
            {
              type: 'mrkdwn',
              text: `*Completed by:*\n${completedBy}`
            },
            {
              type: 'mrkdwn',
              text: `*Target Date:*\n${new Date(milestone.date).toLocaleDateString()}`
            }
          ]
        }
      ,
        this.viewActions(this.milestoneUrl(project, milestone), 'View Milestone')
      ]
    };

    await this.sendNotification(message);
  }

  // Project notifications
  async notifyProjectCreated(project, creator) {
    const message = {
      text: `🚀 New Project: ${project.name}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚀 New Project Created'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Project:*\n${project.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Created by:*\n${creator}`
            },
            {
              type: 'mrkdwn',
              text: `*Start Date:*\n${new Date(project.startDate).toLocaleDateString()}`
            },
            {
              type: 'mrkdwn',
              text: `*Target End:*\n${new Date(project.targetEndDate).toLocaleDateString()}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Objective:*\n${project.objective}`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Team: ${project.teamMembers?.join(', ') || 'No team members yet'}`
            }
          ]
        },
        this.viewActions(this.projectUrl(project), 'View Project')
      ]
    };

    await this.sendNotification(message);
  }

  async notifyTeamMemberAdded(project, newMember, addedBy) {
    const message = {
      text: `👥 Team Member Added: ${newMember}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '👥 New Team Member'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Project:*\n${project.name}`
            },
            {
              type: 'mrkdwn',
              text: `*New Member:*\n${newMember}`
            },
            {
              type: 'mrkdwn',
              text: `*Added by:*\n${addedBy}`
            }
          ]
        }
      ,
        this.viewActions(this.projectUrl(project), 'View Project')
      ]
    };

    await this.sendNotification(message);
  }

  async notifyProjectRisk(project, milestone, expectedProgress, actualProgress, status) {
    const message = {
      text: `⚠ Project Risk: ${project.name}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠ Project Risk Alert'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Project:*\n${project.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Milestone:*\n${milestone.title}`
            },
            {
              type: 'mrkdwn',
              text: `*Expected Progress:*\n${expectedProgress}%`
            },
            {
              type: 'mrkdwn',
              text: `*Actual Progress:*\n${actualProgress}%`
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\n${status}`
            }
          ]
        },
        this.viewActions(this.milestoneUrl(project, milestone), 'View Milestone')
      ]
    };
    await this.sendNotification(message);
  }

  // Helper methods
  priorityEmoji(priority) {
    const emojis = {
      high: '🔴',
      medium: '🟡',
      low: '🟢'
    };
    return emojis[priority] || '⚪';
  }

  statusEmoji(status) {
    const emojis = {
      'todo': '📋',
      'in-progress': '🔄',
      'blocked': '🚫',
      'review': '👀',
      'done': '✅'
    };
    return emojis[status] || '⚪';
  }
}

export default new SlackService();
