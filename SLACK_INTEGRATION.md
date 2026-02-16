# Slack Integration Guide for Nexus

## Overview
Nexus now includes Slack integration to send real-time notifications to your team's Slack workspace. This guide will help you set up and configure Slack notifications.

## Features

The Slack integration sends notifications for:

### Project Events
- ✅ **Project Created** - When a new project is created
- ✅ **Team Member Added** - When a user is added to a project

### Task Events
- ✅ **Task Created** - When a new task is created
- ✅ **Task Updated** - When task details are modified (status, priority, etc.)
- ✅ **Task Completed** - When a task status changes to "done"
- ✅ **Task Assigned** - When a team member is assigned to a task
- ✅ **Task Comment** - When someone adds a comment to a task

### Milestone Events
- ✅ **Milestone Created** - When a new milestone is created
- ✅ **Milestone Completed** - When a milestone is marked as completed

## Setup Instructions

### Step 1: Create a Slack Incoming Webhook

1. Go to your Slack workspace
2. Navigate to **Settings & administration** → **Manage apps**
3. Search for "Incoming Webhooks" and click **Add to Slack**
4. Choose the channel where you want notifications to appear (e.g., `#project-updates`, `#nexus-notifications`)
5. Click **Add Incoming WebHooks integration**
6. Copy the **Webhook URL** (it looks like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX`)

### Step 2: Configure Your Backend

Add the Slack Webhook URL to your backend `.env` file:

```env
# Slack Integration (Optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**Important**: The Slack integration is **optional**. If no webhook URL is configured, the application will continue to work normally without sending Slack notifications.

### Step 3: Restart Your Backend Server

After adding the webhook URL, restart your backend server:

```bash
cd backend
npm run dev
```

## Testing the Integration

Once configured, test the integration by:

1. **Creating a project** - You should see a notification in your Slack channel
2. **Creating a task** - A task creation notification should appear
3. **Assigning a task** - The assigned member should receive a notification
4. **Adding a comment** - Comment notifications should be sent

## Notification Examples

### Task Created Notification
```
🆕 New Task Created
━━━━━━━━━━━━━━━━━━━━
Project: Nexus Development
Task: Implement authentication
Priority: 🔴 HIGH
Created by: john.doe

Description:
Add JWT-based authentication with Google OAuth support

Assigned to: jane.smith, alex.wilson
```

### Task Completed Notification
```
✅ Task Completed!
━━━━━━━━━━━━━━━━━━━━
Project: Nexus Development
Task: Implement authentication
Completed by: jane.smith
Priority: 🔴 HIGH
```

### Milestone Created Notification
```
🎯 New Milestone Created
━━━━━━━━━━━━━━━━━━━━
Project: Nexus Development
Milestone: MVP Launch
Target Date: 03/15/2026
Created by: john.doe

Description:
First production-ready version with core features
```

## Customization

The Slack service is located at: `backend/src/services/slackService.js`

You can customize:
- **Message format** - Modify the Slack Block Kit layouts
- **Notification triggers** - Add/remove events that trigger notifications
- **Emoji indicators** - Change priority and status emojis
- **Channel routing** - Send different events to different channels (requires multiple webhooks)

## Notification Types Reference

| Event | Trigger | Notification Recipients |
|-------|---------|------------------------|
| Project Created | New project created | All workspace members |
| Task Created | New task added to project | All workspace members |
| Task Assigned | Team member assigned to task | All workspace members |
| Task Updated | Task properties changed | All workspace members |
| Task Completed | Task status → "done" | All workspace members |
| Task Comment | Comment added to task | All workspace members |
| Milestone Created | New milestone added | All workspace members |
| Milestone Completed | Milestone marked complete | All workspace members |
| Team Member Added | User added to project team | All workspace members |

## Disabling Slack Notifications

To disable Slack notifications:

1. Remove or comment out the `SLACK_WEBHOOK_URL` from your `.env` file:
   ```env
   # SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
   ```

2. Restart your backend server

The application will continue to function normally without Slack integration.

## Troubleshooting

### Notifications Not Appearing

1. **Check webhook URL** - Ensure the URL is correct and starts with `https://hooks.slack.com/`
2. **Verify channel permissions** - Make sure the webhook has permission to post to the selected channel
3. **Check backend logs** - Look for Slack-related errors in your server console
4. **Test webhook manually** - Use curl to test the webhook:
   ```bash
   curl -X POST -H 'Content-type: application/json' \
   --data '{"text":"Test notification"}' \
   YOUR_WEBHOOK_URL
   ```

### Webhook URL Expired

If your webhook stops working:
1. Go back to Slack's **Incoming Webhooks** settings
2. Regenerate the webhook URL
3. Update your `.env` file with the new URL
4. Restart the backend server

## Security Notes

- ⚠️ **Never commit** your webhook URL to version control
- ⚠️ Keep your `.env` file in `.gitignore`
- ⚠️ Rotate webhook URLs periodically for security
- ⚠️ Use separate webhooks for development and production environments

## Environment Variables Summary

Add to `backend/.env`:

```env
# Slack Integration (Optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## NPM Package

The integration uses the official Slack SDK:
- Package: `@slack/webhook`
- Installed via: `npm install @slack/webhook`

## Support

For more information about Slack webhooks:
- [Slack Incoming Webhooks Documentation](https://api.slack.com/messaging/webhooks)
- [Slack Block Kit Builder](https://app.slack.com/block-kit-builder/)

---

**Integration Status**: ✅ Fully Implemented
**Optional**: Yes (app works without Slack)
**Real-time**: Yes (notifications sent immediately)
