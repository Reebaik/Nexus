
import '../config/env.js';
import express from 'express';
import Project from '../models/Project.js';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import mongoose from 'mongoose';
import eventBus from '../events/eventBus.js';
import githubService from '../services/githubService.js';

const router = express.Router();

// GET /projects/name/:name - get a single project by name for the logged-in user
router.get('/name/:name', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({ name: req.params.name, createdBy: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ project });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /projects/:id - get a single project by id for the logged-in user (owner or team member)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    // Get user to find username
    const user = await User.findById(req.user.userId);
    const username = user ? user.username : req.user.userId;
    
    // Find project where user is either creator or team member
    const project = await Project.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
      $or: [
        { createdBy: req.user.userId },
        { teamMembers: username }
      ]
    });
    
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.tasks) {
      project.tasks = project.tasks.map(task => {
        const raw = task.toObject ? task.toObject() : task;
        const existingMembers = Array.isArray(raw.taskMembers)
          ? raw.taskMembers
          : Array.isArray(raw.teamMembers)
          ? raw.teamMembers
          : [];
        const legacyMembers =
          existingMembers.length > 0
            ? existingMembers
            : Array.isArray(raw.tags) && raw.tags.length > 0
            ? raw.tags
            : raw.assignee
            ? [raw.assignee]
            : [];
        const { tags, assignee, taskMembers, teamMembers, ...rest } = raw;
        const endDate = raw.endDate || (raw.dueDate ? new Date(raw.dueDate) : undefined);
        const dueDate = raw.dueDate || endDate || null;
        return {
          ...rest,
          endDate,
          dueDate,
          taskMembers: legacyMembers,
          comments: raw.comments || [],
          updates: raw.updates || [],
          linkedRequirement: raw.linkedRequirement || undefined
        };
      });
    }

    // Populate createdBy field to get user details
    const populatedProject = await Project.populate(project, {
      path: 'createdBy',
      select: 'username email'
    });
    
    res.json({ project: populatedProject });
  } catch (err) {
    console.error('Error fetching project:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /projects/:id/github/activity - get GitHub activity for a project
router.get('/:id/github/activity', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const username = user ? user.username : req.user.userId;
    
    const project = await Project.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
      $or: [
        { createdBy: req.user.userId },
        { teamMembers: username }
      ]
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });
    const activity = Array.isArray(project.githubActivity)
      ? [...project.githubActivity].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 100)
      : [];
    res.json({
      repo: project.github || null,
      activity
    });
  } catch (err) {
    console.error('Error fetching GitHub activity:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /projects/:id/github/sync - fetch commits and PRs from GitHub and store
router.post('/:id/github/sync', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const username = user ? user.username : req.user.userId;

    // First check if user has access to the project
    const projectCheck = await Project.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
      $or: [
        { createdBy: req.user.userId },
        { teamMembers: username }
      ]
    });
    
    if (!projectCheck) return res.status(404).json({ message: 'Project not found' });

    // Use the sync service (we pass userId for context, but we verified access above)
    // Note: syncProjectById originally checked createdBy. We need to bypass that check or update the service.
    // Instead of syncProjectById, we can use syncProject directly since we already have the project.
    
    const project = await githubService.syncProject(projectCheck);
    
    if (!project) return res.status(404).json({ message: 'Project not found or no repo configured' });
    
    // We need to re-fetch or use the updated project object
    // syncProject modifies the project object and saves it, returning the modified object.
    
    const activity = Array.isArray(project.githubActivity)
      ? [...project.githubActivity].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 100)
      : [];
    res.json({
      repo: project.github || null,
      activity
    });
  } catch (err) {
    console.error('Error syncing GitHub activity:', err);
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

// GET /projects - list all projects for the logged-in user (owner or team member)
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Get user to find username
    const user = await User.findById(req.user.userId);
    const username = user ? user.username : req.user.userId;
    
    // Find projects where user is either creator or team member
    const projects = await Project.find({
      $or: [
        { createdBy: req.user.userId },
        { teamMembers: username }
      ]
    }).sort({ createdAt: -1 });
    
    // Populate createdBy field to get user details
    const populatedProjects = await Project.populate(projects, {
      path: 'createdBy',
      select: 'username email'
    });
    
    res.json({ projects: populatedProjects });
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /users/search - search for users by username or email
router.get('/users/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    }).select('username email').limit(10);

    res.json({ users });
  } catch (err) {
    console.error('Error searching users:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Middleware to check JWT
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// POST /projects - create a new project
router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log('Request body:', req.body);
    const { name, objective, description, startDate, targetEndDate, teamMembers, functionalRequirements, nonFunctionalRequirements, github, repoOwner, repoName, installationId } = req.body;
    console.log('Extracted requirements:', { functionalRequirements, nonFunctionalRequirements });
    
    if (!name || !objective || !startDate || !targetEndDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const project = new Project({
      name,
      objective,
      description,
      startDate,
      targetEndDate,
      teamMembers,
      functionalRequirements: functionalRequirements || [],
      nonFunctionalRequirements: nonFunctionalRequirements || [],
      createdBy: req.user.userId,
    });
    if (github && typeof github === 'object') {
      project.github = {
        ...(project.github || {}),
        ...github
      };
    } else {
      const gh = {};
      if (repoOwner) gh.repoOwner = repoOwner;
      if (repoName) gh.repoName = repoName;
      if (installationId) gh.installationId = installationId;
      if (Object.keys(gh).length > 0) {
        project.github = {
          ...(project.github || {}),
          ...gh
        };
      }
    }
    console.log('Project before save:', project);
    await project.save();
    console.log('Project after save:', project);
    
    const user = await User.findById(req.user.userId);
    const creator = user ? user.username : 'Unknown';
    eventBus.emit('project.created', { project, creator });
    
    res.status(201).json({ message: 'Project created', project });
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /projects/:id - update a project
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, objective, description, startDate, targetEndDate, teamMembers } = req.body;
    
    const project = await Project.findOne({ _id: new mongoose.Types.ObjectId(req.params.id), createdBy: req.user.userId });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Track previous team members for Slack notifications
    const previousTeamMembers = project.teamMembers || [];

    // Update project fields
    if (name) project.name = name;
    if (objective) project.objective = objective;
    if (description !== undefined) project.description = description;
    if (startDate) project.startDate = new Date(startDate);
    if (targetEndDate) project.targetEndDate = new Date(targetEndDate);
    if (teamMembers) project.teamMembers = teamMembers;
    if (req.body.github) {
      project.github = {
        ...(project.github || {}),
        ...(req.body.github || {})
      };
    } else {
      const { repoOwner, repoName, installationId } = req.body;
      if (repoOwner || repoName || installationId) {
        project.github = {
          ...(project.github || {}),
          ...(repoOwner ? { repoOwner } : {}),
          ...(repoName ? { repoName } : {}),
          ...(installationId ? { installationId } : {})
        };
      }
    }

    await project.save();
    
    if (teamMembers) {
      const user = await User.findById(req.user.userId);
      const addedBy = user ? user.username : 'Unknown';
      const newMembers = teamMembers.filter(member => !previousTeamMembers.includes(member));
      for (const member of newMembers) {
        eventBus.emit('team.member.added', { project, member, addedBy });
      }
    }
    
    res.json({ message: 'Project updated successfully', project });
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /projects/:id - delete a project
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: new mongoose.Types.ObjectId(req.params.id), createdBy: req.user.userId });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await Project.deleteOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /projects/:id - update a project
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, objective, description, startDate, targetEndDate, teamMembers } = req.body;
    
    const project = await Project.findOne({ _id: new mongoose.Types.ObjectId(req.params.id), createdBy: req.user.userId });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Update project fields
    if (name) project.name = name;
    if (objective) project.objective = objective;
    if (description !== undefined) project.description = description;
    if (startDate) project.startDate = new Date(startDate);
    if (targetEndDate) project.targetEndDate = new Date(targetEndDate);
    if (teamMembers) project.teamMembers = teamMembers;
    if (req.body.github) {
      project.github = {
        ...(project.github || {}),
        ...(req.body.github || {})
      };
    } else {
      const { repoOwner, repoName, installationId } = req.body;
      if (repoOwner || repoName || installationId) {
        project.github = {
          ...(project.github || {}),
          ...(repoOwner ? { repoOwner } : {}),
          ...(repoName ? { repoName } : {}),
          ...(installationId ? { installationId } : {})
        };
      }
    }

    await project.save();
    res.json({ message: 'Project updated successfully', project });
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /projects/:id/requirements - add a new functional requirement
router.post('/:id/requirements', authMiddleware, async (req, res) => {
  try {
    const { id, title, description, priority } = req.body;
    if (!id || !title || !description || !priority) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const project = await Project.findOne({ _id: new mongoose.Types.ObjectId(req.params.id), createdBy: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const newRequirement = {
      id: `FR-${String(project.functionalRequirements.length + 1).padStart(2, '0')}`,
      title,
      description,
      priority,
      status: 'defined'
    };

    project.functionalRequirements.push(newRequirement);
    await project.save();

    res.status(201).json({ message: 'Functional requirement added', requirement: newRequirement });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /projects/:id/requirements/:reqId - update a functional requirement
router.put('/:id/requirements/:reqId', authMiddleware, async (req, res) => {
  try {
    console.log('PUT request received:', { params: req.params, body: req.body });
    const { title, description, priority, status } = req.body;
    
    const project = await Project.findOne({ _id: new mongoose.Types.ObjectId(req.params.id), createdBy: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const requirement = project.functionalRequirements.find(requirement => requirement.id === req.params.reqId);
    if (!requirement) return res.status(404).json({ message: 'Requirement not found' });

    if (title) requirement.title = title;
    if (description) requirement.description = description;
    if (priority) requirement.priority = priority;
    if (status) requirement.status = status;

    console.log('Updated requirement:', requirement);
    await project.save();
    console.log('Project saved successfully');
    res.json({ message: 'Functional requirement updated', requirement });
  } catch (err) {
    console.error('Error updating functional requirement:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /projects/:id/requirements/:reqId - delete a functional requirement
router.delete('/:id/requirements/:reqId', authMiddleware, async (req, res) => {
  try {
    console.log('DELETE request received:', { params: req.params });
    const project = await Project.findOne({ _id: new mongoose.Types.ObjectId(req.params.id), createdBy: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    console.log('Current functional requirements:', project.functionalRequirements);
    console.log('Requirement to delete ID:', req.params.reqId);
    
    project.functionalRequirements = project.functionalRequirements.filter(requirement => requirement.id !== req.params.reqId);
    console.log('After filtering:', project.functionalRequirements);
    
    await project.save();
    console.log('Project saved successfully');
    res.json({ message: 'Functional requirement deleted' });
  } catch (err) {
    console.error('Error deleting functional requirement:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /projects/:id/non-functional-requirements - add a new non-functional requirement
router.post('/:id/non-functional-requirements', authMiddleware, async (req, res) => {
  try {
    const { category, title, description, priority } = req.body;
    if (!category || !title || !description || !priority) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const project = await Project.findOne({ _id: new mongoose.Types.ObjectId(req.params.id), createdBy: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const newRequirement = {
      id: `NFR-${String(project.nonFunctionalRequirements.length + 1).padStart(2, '0')}`,
      category,
      title,
      description,
      priority,
      status: 'defined'
    };

    project.nonFunctionalRequirements.push(newRequirement);
    await project.save();

    res.status(201).json({ message: 'Non-functional requirement added', requirement: newRequirement });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /projects/:id/non-functional-requirements/:reqId - update a non-functional requirement
router.put('/:id/non-functional-requirements/:reqId', authMiddleware, async (req, res) => {
  try {
    console.log('PUT NFR request received:', { params: req.params, body: req.body });
    const { category, title, description, priority, status } = req.body;
    
    const project = await Project.findOne({ _id: new mongoose.Types.ObjectId(req.params.id), createdBy: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const requirement = project.nonFunctionalRequirements.find(requirement => requirement.id === req.params.reqId);
    if (!requirement) return res.status(404).json({ message: 'Non-functional requirement not found' });

    if (category) requirement.category = category;
    if (title) requirement.title = title;
    if (description) requirement.description = description;
    if (priority) requirement.priority = priority;
    if (status) requirement.status = status;

    console.log('Updated NFR:', requirement);
    await project.save();
    console.log('Project saved successfully');
    res.json({ message: 'Non-functional requirement updated', requirement });
  } catch (err) {
    console.error('Error updating non-functional requirement:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /projects/:id/non-functional-requirements/:reqId - delete a non-functional requirement
router.delete('/:id/non-functional-requirements/:reqId', authMiddleware, async (req, res) => {
  try {
    console.log('DELETE NFR request received:', { params: req.params });
    const project = await Project.findOne({ _id: new mongoose.Types.ObjectId(req.params.id), createdBy: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    console.log('Current non-functional requirements:', project.nonFunctionalRequirements);
    console.log('NFR to delete ID:', req.params.reqId);
    
    project.nonFunctionalRequirements = project.nonFunctionalRequirements.filter(requirement => requirement.id !== req.params.reqId);
    console.log('After filtering:', project.nonFunctionalRequirements);
    
    await project.save();
    console.log('Project saved successfully');
    res.json({ message: 'Non-functional requirement deleted' });
  } catch (err) {
    console.error('Error deleting non-functional requirement:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// TASK MANAGEMENT ROUTES

// GET /projects/:id/tasks - get all tasks for a project
router.get('/:id/tasks', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: new mongoose.Types.ObjectId(req.params.id), createdBy: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const tasks = project.tasks.map(task => {
      const raw = task.toObject ? task.toObject() : task;
      const existingMembers = Array.isArray(raw.taskMembers)
        ? raw.taskMembers
        : Array.isArray(raw.teamMembers)
        ? raw.teamMembers
        : [];
      const legacyMembers =
        existingMembers.length > 0
          ? existingMembers
          : Array.isArray(raw.tags) && raw.tags.length > 0
          ? raw.tags
          : raw.assignee
          ? [raw.assignee]
          : [];
      const { tags, assignee, taskMembers, teamMembers, ...rest } = raw;
      const endDate = raw.endDate || (raw.dueDate ? new Date(raw.dueDate) : undefined);
      const dueDate = raw.dueDate || endDate || null;
      return {
        ...rest,
        endDate,
        dueDate,
        taskMembers: legacyMembers,
        comments: raw.comments || [],
        updates: raw.updates || [],
        linkedRequirement: raw.linkedRequirement || undefined
      };
    });

    res.json({ tasks });
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /projects/:id/tasks/:taskId - update a task
router.put('/:id/tasks/:taskId', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;

    // Get user to find username
    const user = await User.findById(req.user.userId);
    const username = user ? user.username : req.user.userId;

    // Find project where user is either creator or team member
    const project = await Project.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
      $or: [
        { createdBy: req.user.userId },
        { teamMembers: username }
      ]
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const task = project.tasks.find(t => t.id === taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isProjectOwner =
      (project.createdBy && project.createdBy.toString && project.createdBy.toString() === req.user.userId) ||
      project.createdBy === req.user.userId;
    let taskMembersArray = Array.isArray(task.taskMembers)
      ? task.taskMembers
      : Array.isArray(task.teamMembers)
      ? task.teamMembers
      : [];
    const taskTags = Array.isArray(task.tags) ? task.tags : [];
    if (!Array.isArray(taskMembersArray) || taskMembersArray.length === 0) {
      const legacyMembers =
        Array.isArray(taskTags) && taskTags.length > 0
          ? taskTags
          : task.assignee
          ? [task.assignee]
          : [];
      if (legacyMembers.length > 0) {
        task.taskMembers = legacyMembers;
        taskMembersArray = legacyMembers;
      }
    }
    const isAssignedToTask =
      taskMembersArray.includes(username) ||
      taskTags.includes(username) ||
      task.assignee === username;

    console.log('=== BACKEND TASK ASSIGNMENT DEBUG ===');
    console.log('User ID:', req.user.userId);
    console.log('Username:', username);
    console.log('Project owner:', isProjectOwner);
    console.log('Task ID:', taskId);
    console.log('Task teamMembers:', task.teamMembers);
    console.log('Task assignee (old field):', task.assignee);
    console.log('Is assigned to task:', isAssignedToTask);
    console.log('=== END BACKEND DEBUG ===');
    
    if (!isProjectOwner && !isAssignedToTask) {
      return res.status(403).json({ message: 'You can only update tasks that are assigned to you' });
    }

    if (Array.isArray(updates.taskMembers)) {
      task.taskMembers = updates.taskMembers;
    }

    if (updates.dueDate && !updates.endDate) {
      updates.endDate = updates.dueDate;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'dueDate')) {
      delete updates.dueDate;
    }

    // Track previous status for Slack notifications
    const previousStatus = task.status;
    const previousMembers = task.taskMembers ? [...task.taskMembers] : [];

    Object.assign(task, updates, { updatedAt: new Date() });
    
    // Check if task status changed and update linked requirement status
    if (updates.status && task.linkedRequirement) {
      const requirementType = task.linkedRequirement.type;
      const requirementId = task.linkedRequirement.id;
      
      // Find the requirement in the project
      const requirement = requirementType === 'functional' 
        ? project.functionalRequirements.find(req => req.id === requirementId)
        : project.nonFunctionalRequirements.find(req => req.id === requirementId);
      
      if (requirement) {
        // Check if all tasks for this requirement are completed
        const allTasksForRequirement = project.tasks.filter(t => 
          t.linkedRequirement && 
          t.linkedRequirement.type === requirementType && 
          t.linkedRequirement.id === requirementId
        );
        
        const allCompleted = allTasksForRequirement.length > 0 && 
          allTasksForRequirement.every(t => t.status === 'done');
        
        // Update requirement status based on task completion
        const allInReview = allTasksForRequirement.length > 0 && 
          allTasksForRequirement.every(t => t.status === 'review');
        
        if (allCompleted) {
          requirement.status = 'verified';
        } else if (allInReview) {
          requirement.status = 'review';
        } else if (allTasksForRequirement.some(t => t.status === 'in-progress')) {
          requirement.status = 'in-progress';
        } else {
          requirement.status = 'defined';
        }
      }
    }
    
    await project.save();
    
    const updater = username;
    
    // Build changes summary for Slack
    const changes = {};
    if (updates.status && updates.status !== previousStatus) {
      changes['Status'] = `${previousStatus} → ${updates.status}`;
    }
    if (updates.priority) changes['Priority'] = updates.priority;
    if (updates.title) changes['Title'] = updates.title;
    if (updates.taskMembers) changes['Assigned Members'] = updates.taskMembers.join(', ');
    
    // Send task update notification if there are changes
    if (Object.keys(changes).length > 0) {
      eventBus.emit('task.updated', { project, task, updater, changes });
    }
    
    // Send task completed notification if status changed to 'done'
    if (updates.status === 'done' && previousStatus !== 'done') {
      eventBus.emit('task.completed', { project, task, completedBy: updater });
    }
    
    // Notify newly assigned members
    if (updates.taskMembers) {
      const newMembers = updates.taskMembers.filter(member => !previousMembers.includes(member));
      for (const member of newMembers) {
        eventBus.emit('task.assigned', { project, task, assignee: member, assignedBy: updater });
      }
    }
    
    const plainTask = task.toObject ? task.toObject() : task;
    let responseMembers = Array.isArray(plainTask.taskMembers)
      ? plainTask.taskMembers
      : Array.isArray(plainTask.teamMembers)
      ? plainTask.teamMembers
      : [];
    if (!Array.isArray(responseMembers) || responseMembers.length === 0) {
      const legacyMembers =
        Array.isArray(plainTask.tags) && plainTask.tags.length > 0
          ? plainTask.tags
          : plainTask.assignee
          ? [plainTask.assignee]
          : [];
      if (legacyMembers.length > 0) {
        responseMembers = legacyMembers;
      }
    }
    const { assignee, tags, teamMembers, ...restTask } = plainTask;
    res.json({
      message: 'Task updated successfully',
      task: {
        ...restTask,
        taskMembers: responseMembers
      }
    });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /projects/:id/tasks/:taskId/updates - add an update to a task
router.post('/:id/tasks/:taskId/updates', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { author, content } = req.body;

    const project = await Project.findOne({ _id: new mongoose.Types.ObjectId(req.params.id), createdBy: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const task = project.tasks.find(t => t.id === taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const newUpdate = {
      author,
      content,
      date: new Date()
    };

    if (!task.updates) {
      task.updates = [];
    }
    task.updates.push(newUpdate);
    
    await project.save();
    res.status(201).json({ 
      message: 'Update added successfully',
      update: newUpdate 
    });
  } catch (err) {
    console.error('Error adding update:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /projects/:id/tasks - create a new task
router.post('/:id/tasks', authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      taskMembers,
      teamMembers,
      startDate,
      endDate,
      dueDate,
      estimatedHours,
      actualHours,
      dependencies,
      tags,
      linkedRequirement
    } = req.body;

    const project = await Project.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
      createdBy: req.user.userId
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const effectiveMembers = Array.isArray(taskMembers)
      ? taskMembers
      : Array.isArray(teamMembers)
      ? teamMembers
      : Array.isArray(tags)
      ? tags
      : [];

    const endDateValue = endDate || dueDate || null;

    const newTask = {
      id: `TASK-${String(project.tasks.length + 1).padStart(3, '0')}`,
      title,
      description,
      priority: priority || 'medium',
      taskMembers: effectiveMembers,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDateValue ? new Date(endDateValue) : null,
      estimatedHours: estimatedHours || 0,
      actualHours: actualHours || 0,
      dependencies: dependencies || [],
      status: status || 'todo',
      linkedRequirement,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    project.tasks.push(newTask);
    await project.save();

    const user = await User.findById(req.user.userId);
    const creator = user ? user.username : 'Unknown';
    eventBus.emit('task.created', { project, task: newTask, creator });
    
    // Notify assigned members
    if (newTask.taskMembers && newTask.taskMembers.length > 0) {
      for (const member of newTask.taskMembers) {
        eventBus.emit('task.assigned', { project, task: newTask, assignee: member, assignedBy: creator });
      }
    }

    res.status(201).json({ message: 'Task created', task: newTask });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /projects/:id/tasks/:taskId - delete a task
router.delete('/:id/tasks/:taskId', authMiddleware, async (req, res) => {
  try {
    // Get user to find username
    const user = await User.findById(req.user.userId);
    const username = user ? user.username : req.user.userId;

    // Find project where user is either creator or team member
    const project = await Project.findOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
      $or: [
        { createdBy: req.user.userId },
        { teamMembers: username }
      ]
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const task = project.tasks.find(t => t.id === req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isProjectOwner =
      (project.createdBy && project.createdBy.toString && project.createdBy.toString() === req.user.userId) ||
      project.createdBy === req.user.userId;
    const taskMembersArray = Array.isArray(task.taskMembers)
      ? task.taskMembers
      : Array.isArray(task.teamMembers)
      ? task.teamMembers
      : [];
    const taskTags = Array.isArray(task.tags) ? task.tags : [];
    const isAssignedToTask =
      taskMembersArray.includes(username) ||
      taskTags.includes(username) ||
      task.assignee === username;

    if (!isProjectOwner && !isAssignedToTask) {
      return res.status(403).json({ message: 'You can only delete tasks that are assigned to you' });
    }

    project.tasks = project.tasks.filter(task => task.id !== req.params.taskId);
    await project.save();

    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// MILESTONE MANAGEMENT ROUTES

// GET /projects/:id/milestones - get all milestones for a project
router.get('/:id/milestones', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: new mongoose.Types.ObjectId(req.params.id), createdBy: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    
    res.json({ milestones: project.milestones });
  } catch (err) {
    console.error('Error fetching milestones:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /projects/:id/milestones - create a new milestone
router.post('/:id/milestones', authMiddleware, async (req, res) => {
  try {
    const { title, description, date, dependencies } = req.body;
    
    const project = await Project.findOne({ _id: new mongoose.Types.ObjectId(req.params.id), createdBy: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const newMilestone = {
      id: `MILESTONE-${String(project.milestones.length + 1).padStart(2, '0')}`,
      title,
      description,
      date: new Date(date),
      status: 'upcoming',
      dependencies: dependencies || []
    };

    project.milestones.push(newMilestone);
    await project.save();

    const user = await User.findById(req.user.userId);
    const creator = user ? user.username : 'Unknown';
    eventBus.emit('milestone.created', { project, milestone: newMilestone, creator });

    res.status(201).json({ message: 'Milestone created', milestone: newMilestone });
  } catch (err) {
    console.error('Error creating milestone:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /projects/:id/milestones/:milestoneId - update a milestone
router.put('/:id/milestones/:milestoneId', authMiddleware, async (req, res) => {
  try {
    const { title, description, date, dependencies } = req.body;
    
    const project = await Project.findOne({ _id: new mongoose.Types.ObjectId(req.params.id), createdBy: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const milestoneIndex = project.milestones.findIndex(m => m.id === req.params.milestoneId);
    if (milestoneIndex === -1) return res.status(404).json({ message: 'Milestone not found' });

    // Track previous status for Slack notifications
    const previousStatus = project.milestones[milestoneIndex].status;

    // Update milestone fields
    if (title) project.milestones[milestoneIndex].title = title;
    if (description !== undefined) project.milestones[milestoneIndex].description = description;
    if (date) project.milestones[milestoneIndex].date = new Date(date);
    if (dependencies !== undefined) project.milestones[milestoneIndex].dependencies = dependencies;

    await project.save();

    if (project.milestones[milestoneIndex].status === 'completed' && previousStatus !== 'completed') {
      const user = await User.findById(req.user.userId);
      const completedBy = user ? user.username : 'Unknown';
      eventBus.emit('milestone.completed', { project, milestone: project.milestones[milestoneIndex], completedBy });
    }
    eventBus.emit('milestone.updated', { project, milestone: project.milestones[milestoneIndex] });

    res.json({ message: 'Milestone updated', milestone: project.milestones[milestoneIndex] });
  } catch (err) {
    console.error('Error updating milestone:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /projects/:id/milestones/:milestoneId - delete a milestone
router.delete('/:id/milestones/:milestoneId', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: new mongoose.Types.ObjectId(req.params.id), createdBy: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const milestoneIndex = project.milestones.findIndex(m => m.id === req.params.milestoneId);
    if (milestoneIndex === -1) return res.status(404).json({ message: 'Milestone not found' });

    project.milestones.splice(milestoneIndex, 1);
    await project.save();

    res.json({ message: 'Milestone deleted' });
  } catch (err) {
    console.error('Error deleting milestone:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add comment to task
router.post('/:projectId/tasks/:taskId/comments', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { author, content } = req.body;

    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const task = project.tasks.find(t => t.id === taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const newComment = {
      author,
      content,
      date: new Date()
    };

    if (!task.comments) {
      task.comments = [];
    }
    task.comments.push(newComment);
    await project.save();

    eventBus.emit('task.commented', { project, task, comment: newComment, author });

    res.status(201).json({ 
      message: 'Comment added successfully',
      comment: newComment 
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
