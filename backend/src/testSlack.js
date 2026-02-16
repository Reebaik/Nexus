import './config/env.js';
import slackService from './services/slackService.js';

// Test Slack Integration
console.log('🧪 Testing Nexus Slack Integration...\n');

const testProject = {
  name: 'Test Project',
  objective: 'Test Slack notifications',
  startDate: new Date(),
  targetEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  teamMembers: ['john.doe', 'jane.smith']
};

const testTask = {
  id: 'TASK-001',
  title: 'Test Task',
  description: 'This is a test task to verify Slack integration',
  priority: 'high',
  status: 'todo',
  taskMembers: ['john.doe']
};

const testMilestone = {
  id: 'MILESTONE-01',
  title: 'Test Milestone',
  description: 'Test milestone for Slack notifications',
  date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  status: 'upcoming'
};

const testComment = {
  content: 'This is a test comment',
  author: 'test.user',
  date: new Date()
};

async function runTests() {
  try {
    console.log('✅ Test 1: Project Created');
    await slackService.notifyProjectCreated(testProject, 'test.user');
    console.log('   Sent!\n');

    await sleep(1000);

    console.log('✅ Test 2: Task Created');
    await slackService.notifyTaskCreated(testProject, testTask, 'test.user');
    console.log('   Sent!\n');

    await sleep(1000);

    console.log('✅ Test 3: Task Assigned');
    await slackService.notifyTaskAssigned(testProject, testTask, 'john.doe', 'test.user');
    console.log('   Sent!\n');

    await sleep(1000);

    console.log('✅ Test 4: Task Updated');
    await slackService.notifyTaskUpdated(testProject, testTask, 'test.user', {
      'Status': 'todo → in-progress',
      'Priority': 'high'
    });
    console.log('   Sent!\n');

    await sleep(1000);

    console.log('✅ Test 5: Task Comment');
    await slackService.notifyTaskComment(testProject, testTask, testComment, 'test.user');
    console.log('   Sent!\n');

    await sleep(1000);

    console.log('✅ Test 6: Task Completed');
    testTask.status = 'done';
    await slackService.notifyTaskCompleted(testProject, testTask, 'test.user');
    console.log('   Sent!\n');

    await sleep(1000);

    console.log('✅ Test 7: Milestone Created');
    await slackService.notifyMilestoneCreated(testProject, testMilestone, 'test.user');
    console.log('   Sent!\n');

    await sleep(1000);

    console.log('✅ Test 8: Milestone Completed');
    testMilestone.status = 'completed';
    await slackService.notifyMilestoneCompleted(testProject, testMilestone, 'test.user');
    console.log('   Sent!\n');

    await sleep(1000);

    console.log('✅ Test 9: Team Member Added');
    await slackService.notifyTeamMemberAdded(testProject, 'alex.wilson', 'test.user');
    console.log('   Sent!\n');

    console.log('🎉 All tests completed!');
    console.log('\nCheck your Slack channel for 9 test notifications.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run tests
runTests();
