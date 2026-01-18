import React, { useState, useEffect } from 'react';
import styles from '../styles/RequirementModal.module.css';

interface FunctionalRequirement {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'defined' | 'in-progress' | 'review' | 'verified';
}

interface NonFunctionalRequirement {
  id: string;
  category: 'performance' | 'security' | 'usability' | 'scalability' | 'other';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'defined' | 'in-progress' | 'review' | 'verified';
}

interface RequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (requirement: FunctionalRequirement | NonFunctionalRequirement) => void;
  requirement?: FunctionalRequirement | NonFunctionalRequirement;
  type: 'functional' | 'non-functional';
  mode: 'add' | 'edit';
}

const RequirementModal: React.FC<RequirementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  requirement,
  type,
  mode
}) => {
  const [formData, setFormData] = useState({
    id: '',
    category: 'performance' as NonFunctionalRequirement['category'],
    title: '',
    description: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    status: 'defined' as 'defined' | 'in-progress' | 'review' | 'verified'
  });

  useEffect(() => {
    if (requirement && mode === 'edit') {
      setFormData({
        id: requirement.id,
        category: 'category' in requirement ? requirement.category : 'performance',
        title: requirement.title,
        description: requirement.description,
        priority: requirement.priority,
        status: requirement.status
      });
    } else {
      setFormData({
        id: '',
        category: 'performance',
        title: '',
        description: '',
        priority: 'medium',
        status: 'defined'
      });
    }
  }, [requirement, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    const newRequirement = type === 'functional' 
      ? {
          id: formData.id || `FR-${Date.now()}`,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          status: formData.status
        }
      : {
          id: formData.id || `NFR-${Date.now()}`,
          category: formData.category,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          status: formData.status
        };

    onSave(newRequirement);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>
            {mode === 'add' ? 'Add' : 'Edit'} {type === 'functional' ? 'Functional' : 'Non-Functional'} Requirement
          </h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          {type === 'non-functional' && (
            <div className={styles.formGroup}>
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={styles.select}
              >
                <option value="performance">Performance</option>
                <option value="security">Security</option>
                <option value="usability">Usability</option>
                <option value="scalability">Scalability</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={styles.input}
              placeholder="Enter requirement title"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={styles.textarea}
              placeholder="Enter requirement description"
              rows={4}
              required
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className={styles.select}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={styles.select}
              >
                <option value="defined">Defined</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="verified">Verified</option>
              </select>
            </div>
          </div>

          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" className={styles.saveButton}>
              {mode === 'add' ? 'Add' : 'Save'} Requirement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequirementModal;
