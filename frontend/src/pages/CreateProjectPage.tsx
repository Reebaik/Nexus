
import React, { useState, useEffect } from 'react';
import styles from '../styles/LoginPage.module.css';
import { TextField, Button, Paper, FormControlLabel, Switch } from '@mui/material';
import { motion } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import RequirementModal from '../components/RequirementModal';

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
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [installationId, setInstallationId] = useState('');
  const [repoEnabled, setRepoEnabled] = useState(false);
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
    if (repoEnabled) {
      const hasOwner = repoOwner && repoOwner.trim().length > 0;
      const hasName = repoName && repoName.trim().length > 0;
      if (hasOwner !== hasName) {
        setError('Please provide both GitHub repo owner and repo name, or leave both empty.');
        return;
      }
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('nexus_jwt')}`,
        },
        body: JSON.stringify((() => {
          const payload: any = {
            name,
            objective,
            description,
            startDate,
            targetEndDate,
            teamMembers,
            functionalRequirements,
            nonFunctionalRequirements
          };
          if (repoEnabled) {
            const github: any = {};
            if (repoOwner) github.repoOwner = repoOwner.trim();
            if (repoName) github.repoName = repoName.trim();
            if (installationId) github.installationId = installationId.trim();
            if (github.repoOwner && github.repoName) {
              payload.github = github;
            }
          }
          return payload;
        })())
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
    <div className={styles.pageWrapper} style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
            <Tilt
              glareEnable={true}
              glareColor="rgba(255,255,255,0.12)"
              glarePosition="all"
              tiltMaxAngleX={3}
              tiltMaxAngleY={3}
              perspective={1200}
              scale={1.01}
              transitionSpeed={2500}
            >
              <Paper elevation={6} className={styles.loginContainer} style={{ 
                background: '#111', 
                borderRadius: 16, 
                padding: 32, 
                maxWidth: 800, 
                width: '90vw', 
                maxHeight: '90vh', 
                overflowY: 'auto',
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center' 
              }}>
            <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className={styles.inputField} style={{ marginBottom: 20, width: '95%' }}>
                <TextField
                  fullWidth
                  label="Project Name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  InputProps={{
                    style: { color: '#fff', fontSize: 20, height: 56, background: '#222', borderRadius: 8, border: '1.5px solid #444' },
                  }}
                  InputLabelProps={{ style: { color: '#aaa', fontSize: 18 } }}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#444',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#0072ff',
                    },
                  }}
                />
              </div>
              <div className={styles.inputField} style={{ marginBottom: 20, width: '95%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <h3 style={{ color: '#fff', margin: '8px 0 12px', fontSize: 16 }}>GitHub (optional)</h3>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={repoEnabled}
                        onChange={(_, v) => setRepoEnabled(v)}
                        color="primary"
                      />
                    }
                    label={<span style={{ color: '#ddd' }}>Connect repository</span>}
                  />
                </div>
                {repoEnabled && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
                      <TextField
                        fullWidth
                        label="Repo Owner"
                        value={repoOwner}
                        onChange={e => setRepoOwner(e.target.value)}
                        InputProps={{
                          style: { color: '#fff', fontSize: 16, height: 48, background: '#222', borderRadius: 8, border: '1.5px solid #444' },
                        }}
                        InputLabelProps={{ style: { color: '#aaa', fontSize: 16 } }}
                        sx={{
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#444',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#0072ff',
                          },
                        }}
                      />
                      <TextField
                        fullWidth
                        label="Repo Name"
                        value={repoName}
                        onChange={e => setRepoName(e.target.value)}
                        InputProps={{
                          style: { color: '#fff', fontSize: 16, height: 48, background: '#222', borderRadius: 8, border: '1.5px solid #444' },
                        }}
                        InputLabelProps={{ style: { color: '#aaa', fontSize: 16 } }}
                        sx={{
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#444',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#0072ff',
                          },
                        }}
                      />
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <TextField
                        fullWidth
                        label="GitHub App Installation ID"
                        value={installationId}
                        onChange={e => setInstallationId(e.target.value)}
                        placeholder="Optional"
                        InputProps={{
                          style: { color: '#fff', fontSize: 16, height: 48, background: '#222', borderRadius: 8, border: '1.5px solid #444' },
                        }}
                        InputLabelProps={{ style: { color: '#aaa', fontSize: 16 } }}
                        sx={{
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#444',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#0072ff',
                          },
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className={styles.inputField} style={{ marginBottom: 20, width: '95%' }}>
                <TextField
                  fullWidth
                  label="Objective"
                  value={objective}
                  onChange={e => setObjective(e.target.value)}
                  required
                  InputProps={{
                    style: { color: '#fff', fontSize: 20, height: 56, background: '#222', borderRadius: 8, border: '1.5px solid #444' },
                  }}
                  InputLabelProps={{ style: { color: '#aaa', fontSize: 18 } }}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#444',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#0072ff',
                    },
                  }}
                />
              </div>
              <div className={styles.inputField} style={{ marginBottom: 20, width: '95%' }}>
                <TextField
                  fullWidth
                  label="Description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  multiline
                  rows={4}
                  InputProps={{
                    style: { color: '#fff', fontSize: 18, background: '#222', borderRadius: 8, border: '1.5px solid #444' },
                  }}
                  InputLabelProps={{ style: { color: '#aaa', fontSize: 18 } }}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#444',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#0072ff',
                    },
                  }}
                />
              </div>
              <div className={styles.inputField} style={{ marginBottom: 20, width: '95%' }}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true, style: { color: '#aaa', fontSize: 18 } }}
                  InputProps={{ style: { color: '#fff', fontSize: 18, height: 56, background: '#222', borderRadius: 8, border: '1.5px solid #444' } }}
                  required
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#444',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#0072ff',
                    },
                  }}
                />
              </div>
              <div className={styles.inputField} style={{ marginBottom: 20, width: '95%' }}>
                <TextField
                  fullWidth
                  label="Target End Date"
                  type="date"
                  value={targetEndDate}
                  onChange={e => setTargetEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true, style: { color: '#aaa', fontSize: 18 } }}
                  InputProps={{ style: { color: '#fff', fontSize: 18, height: 56, background: '#222', borderRadius: 8, border: '1.5px solid #444' } }}
                  required
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#444',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#0072ff',
                    },
                  }}
                />
              </div>
              <div className={styles.inputField} style={{ marginBottom: 20, width: '95%' }}>
                <label style={{ color: '#aaa', fontSize: 18, marginBottom: 8, display: 'block' }}>Team Members</label>
                <div className={styles.memberManagement}>
                  <div className={styles.memberInput}>
                    <TextField
                      fullWidth
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      onFocus={() => setShowMemberSearch(true)}
                      onBlur={() => setTimeout(() => setShowMemberSearch(false), 200)}
                      placeholder="Search users by username or email"
                      InputProps={{
                        style: { color: '#fff', fontSize: 18, background: '#222', borderRadius: 8, border: '1.5px solid #444' },
                      }}
                      InputLabelProps={{ style: { color: '#aaa', fontSize: 18 } }}
                      sx={{
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#444',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#0072ff',
                        },
                      }}
                    />
                    {showMemberSearch && memberSearchQuery && (
                      <div className={styles.memberSearchResults}>
                        {searchResults.map((user, index) => (
                          <div 
                            key={index}
                            className={styles.memberResult}
                            onClick={() => handleAddMember(user)}
                          >
                            <div className={styles.memberInfo}>
                              <span className={styles.memberUsername}>{user.username}</span>
                              <span className={styles.memberEmail}>{user.email}</span>
                            </div>
                          </div>
                        ))}
                        {searchResults.length === 0 && (
                          <div className={styles.noResults}>No users found</div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Selected Members */}
                  <div className={styles.memberList}>
                    {teamMembers.map((member, index) => (
                      <div key={index} className={styles.memberChip}>
                        <span>{member}</span>
                        <button
                          type="button"
                          className={styles.removeMember}
                          onClick={() => handleRemoveMember(member)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Requirements Sections */}
              <div style={{ width: '95%', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ color: '#fff', margin: 0, fontSize: 16 }}>Functional Requirements</h3>
                  <Button
                    onClick={() => openModal('functional', 'add')}
                    sx={{
                      background: '#7c5cff',
                      color: '#fff',
                      fontSize: 12,
                      padding: '4px 10px',
                      '&:hover': { background: '#6d4df5' }
                    }}
                  >
                    + Add
                  </Button>
                </div>
                <div style={{ background: '#222', borderRadius: 8, padding: 12, marginBottom: 16, maxHeight: 120, overflowY: 'auto' }}>
                  {functionalRequirements.length === 0 ? (
                    <p style={{ color: '#aaa', textAlign: 'center', margin: 0 }}>No functional requirements added</p>
                  ) : (
                    functionalRequirements.map((req, index) => (
                      <div key={req.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '8px 0', 
                        borderBottom: index < functionalRequirements.length - 1 ? '1px solid #333' : 'none'
                      }}>
                        <div>
                          <div style={{ color: '#fff', fontSize: 14 }}>{req.title}</div>
                          <div style={{ color: '#aaa', fontSize: 12 }}>{req.description}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Button
                            size="small"
                            onClick={() => openModal('functional', 'edit', req)}
                            sx={{ 
                              background: 'rgba(59, 130, 246, 0.2)', 
                              color: '#60a5fa', 
                              fontSize: 12,
                              padding: '4px 8px',
                              minWidth: 'auto'
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            onClick={() => handleDeleteRequirement(req.id, 'functional')}
                            sx={{ 
                              background: 'rgba(239, 68, 68, 0.2)', 
                              color: '#f87171', 
                              fontSize: 12,
                              padding: '4px 8px',
                              minWidth: 'auto'
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ width: '95%', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ color: '#fff', margin: 0, fontSize: 16 }}>Non-Functional Requirements</h3>
                  <Button
                    onClick={() => openModal('non-functional', 'add')}
                    sx={{
                      background: '#7c5cff',
                      color: '#fff',
                      fontSize: 12,
                      padding: '4px 10px',
                      '&:hover': { background: '#6d4df5' }
                    }}
                  >
                    + Add
                  </Button>
                </div>
                <div style={{ background: '#222', borderRadius: 8, padding: 12, marginBottom: 16, maxHeight: 120, overflowY: 'auto' }}>
                  {nonFunctionalRequirements.length === 0 ? (
                    <p style={{ color: '#aaa', textAlign: 'center', margin: 0 }}>No non-functional requirements added</p>
                  ) : (
                    nonFunctionalRequirements.map((req, index) => (
                      <div key={req.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '8px 0', 
                        borderBottom: index < nonFunctionalRequirements.length - 1 ? '1px solid #333' : 'none'
                      }}>
                        <div>
                          <div style={{ color: '#fff', fontSize: 14 }}>{req.title}</div>
                          <div style={{ color: '#aaa', fontSize: 12 }}>{req.category} - {req.description}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Button
                            size="small"
                            onClick={() => openModal('non-functional', 'edit', req)}
                            sx={{ 
                              background: 'rgba(59, 130, 246, 0.2)', 
                              color: '#60a5fa', 
                              fontSize: 12,
                              padding: '4px 8px',
                              minWidth: 'auto'
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            onClick={() => handleDeleteRequirement(req.id, 'non-functional')}
                            sx={{ 
                              background: 'rgba(239, 68, 68, 0.2)', 
                              color: '#f87171', 
                              fontSize: 12,
                              padding: '4px 8px',
                              minWidth: 'auto'
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {error && <div className={styles.error}>{error}</div>}
              {success && <div className={styles.success}>{success}</div>}
              <Button
                type="submit"
                fullWidth
                sx={{
                  marginTop: 2.5,
                  fontWeight: 700,
                  fontSize: 18,
                  letterSpacing: 1,
                  borderRadius: 2.5,
                  background: 'linear-gradient(90deg, #0072ff 0%, #00c6ff 100%)',
                  color: '#fff',
                  boxShadow: '0 4px 24px 0 rgba(0,114,255,0.18)',
                  textTransform: 'none',
                  transition: 'background 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #005be7 0%, #00aaff 100%)',
                    boxShadow: '0 6px 32px 0 rgba(0,114,255,0.28)',
                  },
                }}
              >
                Create Project
              </Button>
            </form>
          </Paper>
        </Tilt>
      </motion.div>

      <RequirementModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onSave={handleSaveRequirement}
        requirement={modalState.editingRequirement}
        type={modalState.type}
        mode={modalState.mode}
      />
    </div>
  );
};

export default CreateProjectPage;
