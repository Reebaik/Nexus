import React, { useState, useEffect } from 'react';
import styles from '../styles/ProjectPlanningPage.module.css';

interface Task {
  id: string;
  title: string;
  status: string;
}

interface Milestone {
  id: string;
  title: string;
  description?: string;
  date: Date | string;
  status: 'upcoming' | 'completed' | 'overdue';
  dependencies: string[];
}

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (milestoneData: Partial<Milestone>) => void;
  milestone?: Milestone;
  availableTasks?: Task[];
  mode: 'add' | 'edit';
}

const MilestoneModal: React.FC<MilestoneModalProps> = ({
  isOpen,
  onClose,
  onSave,
  milestone,
  availableTasks = [],
  mode
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    dependencies: [] as string[]
  });

  useEffect(() => {
    if (milestone && mode === 'edit') {
      setFormData({
        title: milestone.title || '',
        description: milestone.description || '',
        date: milestone.date instanceof Date 
          ? milestone.date.toISOString().split('T')[0]
          : new Date(milestone.date).toISOString().split('T')[0],
        dependencies: milestone.dependencies || []
      });
    } else {
      setFormData({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        dependencies: []
      });
    }
  }, [milestone, mode, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Please enter a milestone title');
      return;
    }

    if (!formData.date) {
      alert('Please select a target date');
      return;
    }

    const milestoneData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      date: new Date(formData.date),
      dependencies: formData.dependencies,
      status: 'upcoming' as const
    };

    onSave(milestoneData);
  };

  const handleTaskToggle = (taskId: string) => {
    setFormData(prev => ({
      ...prev,
      dependencies: prev.dependencies.includes(taskId)
        ? prev.dependencies.filter(id => id !== taskId)
        : [...prev.dependencies, taskId]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>{mode === 'add' ? 'Add Milestone' : 'Edit Milestone'}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Milestone Title *</label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., MVP Ready, Phase 1 Complete"
              className={styles.formInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What must be completed by this milestone?"
              className={styles.formTextarea}
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="date">Target Date *</label>
            <div className={styles.dateInputContainer}>
              <input
                type="date"
                id="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className={styles.formInput}
                min={new Date().toISOString().split('T')[0]}
                style={{ paddingRight: '50px' }}
              />
              <div className={styles.calendarIconWrapper}>
                <button 
                  type="button"
                  className={styles.calendarIcon}
                  onClick={() => {
                    const dateInput = document.getElementById('date') as HTMLInputElement;
                    if (dateInput && typeof dateInput.showPicker === 'function') {
                      dateInput.showPicker();
                    } else if (dateInput) {
                      dateInput.focus();
                    }
                  }}
                  aria-label="Open calendar"
                >
                  📅
                </button>
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Linked Tasks</label>
            <p className={styles.formHelp}>
              Select tasks that must be completed for this milestone
            </p>
            <div className={styles.taskSelectionList}>
              {availableTasks.length === 0 ? (
                <p className={styles.noTasksMessage}>
                  No tasks available. Create tasks first, then link them to milestones.
                </p>
              ) : (
                availableTasks.map(task => (
                  <label key={task.id} className={styles.taskSelectionItem}>
                    <input
                      type="checkbox"
                      checked={formData.dependencies.includes(task.id)}
                      onChange={() => handleTaskToggle(task.id)}
                      className={styles.taskCheckbox}
                    />
                    <span className={`${styles.taskStatus} ${styles[task.status]}`}>
                      {task.status === 'done' ? '✅' : 
                       task.status === 'in-progress' ? '🔄' : 
                       task.status === 'blocked' ? '🚫' : '⭕'}
                    </span>
                    <span className={styles.taskTitle}>{task.title}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveButton}
            >
              {mode === 'add' ? 'Add Milestone' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MilestoneModal;
