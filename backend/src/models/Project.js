import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  objective: { type: String, required: true },
  description: { type: String },
  startDate: { type: Date, required: true },
  targetEndDate: { type: Date, required: true },
  teamMembers: [{ type: String }], // store usernames or emails for now
  github: {
    repoOwner: { type: String },
    repoName: { type: String },
    installationId: { type: String }
  },
  githubActivity: [{
    type: { type: String, enum: ['push', 'pull_request'], required: true },
    actor: { type: String },
    action: { type: String },
    ref: { type: String },
    prNumber: { type: Number },
    merged: { type: Boolean },
    commitCount: { type: Number },
    commits: [{
      sha: { type: String },
      message: { type: String }
    }],
    date: { type: Date, default: Date.now }
  }],
  functionalRequirements: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
    status: { type: String, enum: ['defined', 'in-progress', 'review', 'verified'], default: 'defined' }
  }],
  nonFunctionalRequirements: [{
    id: { type: String, required: true },
    category: { type: String, enum: ['performance', 'security', 'usability', 'scalability', 'other'], required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
    status: { type: String, enum: ['defined', 'in-progress', 'review', 'verified'], default: 'defined' }
  }],
  tasks: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['todo', 'in-progress', 'blocked', 'review', 'done'], default: 'todo' },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    assignee: { type: String },
    taskMembers: [{ type: String }],
    startDate: { type: Date },
    endDate: { type: Date },
    estimatedHours: { type: Number },
    actualHours: { type: Number, default: 0 },
    dependencies: [{ type: String }], // task IDs
    tags: [{ type: String }],
    linkedRequirement: {
      type: { type: String, enum: ['functional', 'non-functional'] },
      id: { type: String }
    },
    comments: [{
      author: { type: String, required: true },
      content: { type: String, required: true },
      date: { type: Date, default: Date.now }
    }],
    updates: [{
      author: { type: String, required: true },
      content: { type: String, required: true },
      date: { type: Date, default: Date.now }
    }],
    commits: [{
      sha: { type: String, required: true },
      message: { type: String, required: true },
      author: { type: String },
      url: { type: String },
      date: { type: Date }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }],
  milestones: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    status: { type: String, enum: ['upcoming', 'completed', 'overdue'], default: 'upcoming' },
    dependencies: [{ type: String }] // task IDs
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('Project', projectSchema);
