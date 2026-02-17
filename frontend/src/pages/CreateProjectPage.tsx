
import React, { useState, useEffect } from 'react';
import styles from '../styles/CreateProjectPage.module.css';
import { motion } from 'framer-motion';
import RequirementModal from '../components/RequirementModal';
import { DatePicker, ConfigProvider, theme } from 'antd';
import dayjs from 'dayjs';

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

const CreateProjectPage: React.FC = () => {
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [targetEndDate, setTargetEndDate] = useState('');
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ username: string, email: string }>>([]);
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [functionalRequirements, setFunctionalRequirements] = useState<FunctionalRequirement[]>([]);
  const [nonFunctionalRequirements, setNonFunctionalRequirements] = useState<NonFunctionalRequirement[]>([]);
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'functional' as 'functional' | 'non-functional',
    mode: 'add' as 'add' | 'edit',
    editingRequirement: undefined as FunctionalRequirement | NonFunctionalRequirement | undefined
  });

  // Search for users when query changes
  const handleSearchMembers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/projects/users/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("nexus_jwt")}`,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || []);
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (memberSearchQuery) {
        handleSearchMembers(memberSearchQuery);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [memberSearchQuery]);

  const handleAddMember = (member: { username: string, email: string }) => {
    // Check if member already exists
    if (teamMembers.includes(member.username)) {
      return;
    }
    
    setTeamMembers(prev => [...prev, member.username]);
    
    // Show selected username briefly
    setMemberSearchQuery(member.username);
    setSearchResults([]);
    setShowMemberSearch(false);
    
    // Clear search field after a short delay
    setTimeout(() => {
      setMemberSearchQuery("");
    }, 300);
  };

  const handleRemoveMember = (memberToRemove: string) => {
    setTeamMembers(prev => prev.filter(member => member !== memberToRemove));
  };

  const openModal = (type: 'functional' | 'non-functional', mode: 'add' | 'edit', requirement?: FunctionalRequirement | NonFunctionalRequirement) => {
    setModalState({
      isOpen: true,
      type,
      mode,
      editingRequirement: requirement || undefined
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      type: 'functional',
      mode: 'add',
      editingRequirement: undefined
    });
  };

  const handleSaveRequirement = (requirement: FunctionalRequirement | NonFunctionalRequirement) => {
    if (modalState.type === 'functional') {
      if (modalState.mode === 'add') {
        setFunctionalRequirements([...functionalRequirements, requirement as FunctionalRequirement]);
      } else {
        setFunctionalRequirements(functionalRequirements.map(req => 
          req.id === requirement.id ? requirement as FunctionalRequirement : req
        ));
      }
    } else {
      if (modalState.mode === 'add') {
        setNonFunctionalRequirements([...nonFunctionalRequirements, requirement as NonFunctionalRequirement]);
      } else {
        setNonFunctionalRequirements(nonFunctionalRequirements.map(req => 
          req.id === requirement.id ? requirement as NonFunctionalRequirement : req
        ));
      }
    }
  };

  const handleDeleteRequirement = (requirementId: string, type: 'functional' | 'non-functional') => {
    if (type === 'functional') {
      setFunctionalRequirements(functionalRequirements.filter(req => req.id !== requirementId));
    } else {
      setNonFunctionalRequirements(nonFunctionalRequirements.filter(req => req.id !== requirementId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!name || !objective || !startDate || !targetEndDate) {
      setError('Please fill all required fields');
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('nexus_jwt')}`,
        },
        body: JSON.stringify({
          name,
          objective,
          description,
          startDate,
          targetEndDate,
          teamMembers,
          functionalRequirements,
          nonFunctionalRequirements
        })
      });
      const data = await res.json();
      if (!res.ok) setError(data.message || 'Failed to create project');
      else {
        setSuccess('Project created! Redirecting to My Projects...');
        // Redirect to My Projects page after 1.5 seconds
        setTimeout(() => {
          window.location.href = '/projects';
        }, 1500);
      }
    } catch (err) {
      setError('Server error');
    }
  };

  return (
    <div className={styles.root}>
      {/* Background Elements */}
      <div className={styles.bgWrapper}>
        <div className={styles.bgGradient} />
        <div className={styles.gridOverlay} />
      </div>

      <motion.div
        className={styles.formContainer}
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Create Project</h1>
          <p className={styles.pageSubtitle}>Define your new workspace and requirements</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <p style={{ color: '#ff5252', marginBottom: 20, textAlign: 'center' }}>{error}</p>}
          {success && <p style={{ color: '#4caf50', marginBottom: 20, textAlign: 'center' }}>{success}</p>}

          <div className={styles.formSection}>
            <div className={styles.sectionTitle}>Project Details</div>
            
            <div className={styles.inputGroup}>
              <label className={styles.label}>Project Name *</label>
              <input
                className={styles.inputField}
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Enter project name"
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Objective *</label>
              <input
                className={styles.inputField}
                value={objective}
                onChange={e => setObjective(e.target.value)}
                required
                placeholder="Enter project objective"
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textareaField}
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe project scope and details"
              />
            </div>

            <div className={styles.formGrid}>
              <ConfigProvider
                theme={{
                  algorithm: theme.darkAlgorithm,
                  token: {
                    colorBgContainer: 'rgba(255, 255, 255, 0.05)',
                    colorBorder: 'rgba(255, 255, 255, 0.2)',
                    colorText: '#fff',
                    colorTextPlaceholder: 'rgba(255, 255, 255, 0.4)',
                  }
                }}
              >
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Start Date *</label>
                  <DatePicker
                    className={styles.inputField}
                    value={startDate ? dayjs(startDate) : null}
                    onChange={(date) => setStartDate(date ? date.format('YYYY-MM-DD') : '')}
                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#fff' }}
                    format="YYYY-MM-DD"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Target End Date *</label>
                  <DatePicker
                    className={styles.inputField}
                    value={targetEndDate ? dayjs(targetEndDate) : null}
                    onChange={(date) => setTargetEndDate(date ? date.format('YYYY-MM-DD') : '')}
                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#fff' }}
                    format="YYYY-MM-DD"
                  />
                </div>
              </ConfigProvider>
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.sectionTitle}>Team Members</div>
            <div className={styles.inputGroup}>
              <div className={styles.memberSearchContainer}>
                <input
                  className={styles.inputField}
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  onFocus={() => setShowMemberSearch(true)}
                  onBlur={() => setTimeout(() => setShowMemberSearch(false), 200)}
                  placeholder="Search users by username or email"
                />
                {showMemberSearch && memberSearchQuery && (
                  <div className={styles.searchResults}>
                    {searchResults.length > 0 ? (
                      searchResults.map((user, index) => (
                        <div 
                          key={index}
                          className={styles.searchResultItem}
                          onMouseDown={() => handleAddMember(user)} // Use onMouseDown to prevent blur before click
                        >
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#fff', fontWeight: 600 }}>{user.username}</span>
                            <span style={{ color: '#aaa', fontSize: '0.85rem' }}>{user.email}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#aaa' }}>No users found</div>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.memberList}>
                {teamMembers.map((member, index) => (
                  <div key={index} className={styles.memberChip}>
                    <div className={styles.memberAvatar}>
                      {member.charAt(0).toUpperCase()}
                    </div>
                    <span className={styles.memberName}>{member}</span>
                    <button
                      type="button"
                      className={styles.removeMemberBtn}
                      onClick={() => handleRemoveMember(member)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.formSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div className={styles.sectionTitle} style={{ margin: 0 }}>Functional Requirements</div>
              <button 
                type="button" 
                onClick={() => openModal('functional', 'add')}
                className={styles.cancelBtn}
                style={{ padding: '8px 16px', fontSize: '0.9rem' }}
              >
                + Add New
              </button>
            </div>
            
            {functionalRequirements.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {functionalRequirements.map((req) => (
                  <div key={req.id} style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    padding: '16px', 
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', color: '#fff' }}>{req.title}</h4>
                      <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>{req.description.substring(0, 60)}...</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        type="button"
                        onClick={() => openModal('functional', 'edit', req)}
                        className={styles.cancelBtn}
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        Edit
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeleteRequirement(req.id, 'functional')}
                        className={styles.removeMemberBtn}
                        style={{ fontSize: '1.2rem', padding: '0 8px' }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                No functional requirements added yet.
              </p>
            )}
          </div>

          <div className={styles.formSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div className={styles.sectionTitle} style={{ margin: 0 }}>Non-Functional Requirements</div>
              <button 
                type="button" 
                onClick={() => openModal('non-functional', 'add')}
                className={styles.cancelBtn}
                style={{ padding: '8px 16px', fontSize: '0.9rem' }}
              >
                + Add New
              </button>
            </div>

            {nonFunctionalRequirements.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {nonFunctionalRequirements.map((req) => (
                  <div key={req.id} style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    padding: '16px', 
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', color: '#fff' }}>{req.title}</h4>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          background: 'rgba(0, 114, 255, 0.2)', 
                          color: '#00c6ff' 
                        }}>
                          {req.category}
                        </span>
                        <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>{req.description.substring(0, 50)}...</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        type="button"
                        onClick={() => openModal('non-functional', 'edit', req)}
                        className={styles.cancelBtn}
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        Edit
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeleteRequirement(req.id, 'non-functional')}
                        className={styles.removeMemberBtn}
                        style={{ fontSize: '1.2rem', padding: '0 8px' }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                No non-functional requirements added yet.
              </p>
            )}
          </div>

          <div className={styles.actions}>
            <button 
              type="button" 
              className={styles.cancelBtn}
              onClick={() => window.history.back()}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={styles.submitBtn}
            >
              Create Project
            </button>
          </div>
        </form>

        <RequirementModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onSave={handleSaveRequirement}
          type={modalState.type}
          mode={modalState.mode}
          requirement={modalState.editingRequirement}
        />
      </motion.div>
    </div>
  );
};

export default CreateProjectPage;
