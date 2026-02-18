import Project from '../models/Project.js';
import { generateExecutiveBrief } from '../services/aiService.js';

export const getExecutiveBrief = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Cache check: Return cached brief if generated less than 24 hours ago AND project hasn't been updated since
    if (project.aiBrief && project.aiGeneratedAt) {
      const oneDay = 24 * 60 * 60 * 1000;
      const timeSinceGeneration = new Date() - new Date(project.aiGeneratedAt);
      const isRecent = timeSinceGeneration < oneDay;
      const isUpToDate = new Date(project.updatedAt) <= new Date(project.aiGeneratedAt);

      if (isRecent && isUpToDate) {
        return res.json(project.aiBrief);
      }
    }

    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter(t => t.status === "done").length;

    const overdueTasks = project.tasks.filter(t =>
      t.status !== "done" && t.endDate && new Date(t.endDate) < new Date()
    ).length;

    const completionPercentage = totalTasks
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    const milestoneSummary = project.milestones.map(m => ({
      name: m.title,
      status: m.status,
      date: m.date
    }));

    // Workload Distribution
    const workload = {};
    project.tasks.forEach(t => {
      const uniqueAssignees = new Set();
      
      if (t.assignee) uniqueAssignees.add(t.assignee);
      if (t.taskMembers && Array.isArray(t.taskMembers)) {
        t.taskMembers.forEach(m => uniqueAssignees.add(m));
      }

      if (uniqueAssignees.size === 0) {
        workload['Unassigned'] = (workload['Unassigned'] || 0) + 1;
      } else {
        uniqueAssignees.forEach(person => {
           workload[person] = (workload[person] || 0) + 1;
        });
      }
    });

    const metrics = {
      completionPercentage,
      totalTasks,
      completedTasks,
      overdueTasks,
      milestones: milestoneSummary,
      workload
    };

    const aiResponse = await generateExecutiveBrief(metrics);

    // Save to DB
    project.aiBrief = aiResponse;
    project.aiGeneratedAt = new Date();
    await project.save();

    res.json(aiResponse);

  } catch (error) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ message: "AI generation failed" });
  }
};
