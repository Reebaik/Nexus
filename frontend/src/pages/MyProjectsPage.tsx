import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import styles from "../styles/MyProjectsPage.module.css";
import { useUser } from "../contexts/UserContext";
import { motion } from "framer-motion";
import { DatePicker, ConfigProvider, theme } from 'antd';
import dayjs from 'dayjs';
import { 
  Add, 
  FolderOpen, 
  AccessTime, 
  Person, 
  Edit,
  Delete
} from "@mui/icons-material";

interface Project {
    _id: string;
    name: string;
    objective: string;
    description: string;
    startDate: string;
    targetEndDate: string;
    createdBy: string | { username: string; email: string };
    teamMembers: string[];
}

const MyProjectsPage: React.FC = () => {
    const { user, isProjectOwner, isProjectMember, canEditProject } = useUser();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        objective: "",
        description: "",
        startDate: "",
        targetEndDate: "",
        teamMembers: [] as string[]
    });
    const [memberSearchQuery, setMemberSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Array<{ username: string, email: string }>>([]);
    const [showMemberSearch, setShowMemberSearch] = useState(false);
    const navigate = useNavigate();

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

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/projects`,
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem("nexus_jwt")}`,
                        },
                    }
                );
                const data = await res.json();
                
                if (!res.ok) {
                    setError(data.message || "Failed to fetch projects");
                } else {
                    // Filter projects to show only those where user is owner or team member
                    const userProjects = (data.projects || []).filter((project: Project) => {
                        const isOwner = isProjectOwner(project);
                        const isMember = isProjectMember(project);
                        return isOwner || isMember;
                    });
                    setProjects(userProjects);
                }
            } catch (error) {
                setError("Server error");
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, [user, isProjectOwner, isProjectMember]);

    const handleEditProject = (project: Project) => {
        setEditingProject(project);

        // Format dates for HTML date inputs (YYYY-MM-DD)
        const formatDateForInput = (dateString: string) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        };

        setFormData({
            name: project.name,
            objective: project.objective,
            description: project.description || "",
            startDate: formatDateForInput(project.startDate),
            targetEndDate: formatDateForInput(project.targetEndDate),
            teamMembers: project.teamMembers || []
        });
        setEditModalOpen(true);
    };

    const handleDeleteProject = async (projectId: string, projectName: string) => {
        if (!confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/api/projects/${projectId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("nexus_jwt")}`,
                    },
                }
            );

            if (res.ok) {
                // Remove project from local state
                setProjects(prev => prev.filter(p => p._id !== projectId));
            } else {
                const data = await res.json();
                setError(data.message || "Failed to delete project");
            }
        } catch {
            setError("Server error while deleting project");
        }
    };

    const handleSaveProject = async () => {
        if (!editingProject) return;

        try {
            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/api/projects/${editingProject._id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("nexus_jwt")}`,
                    },
                    body: JSON.stringify({
                        name: formData.name,
                        objective: formData.objective,
                        description: formData.description,
                        startDate: formData.startDate,
                        targetEndDate: formData.targetEndDate,
                        teamMembers: formData.teamMembers
                    }),
                }
            );

            if (res.ok) {
                const data = await res.json();
                // Update project in local state
                setProjects(prev =>
                    prev.map(p => p._id === editingProject._id ? data.project : p)
                );
                setEditModalOpen(false);
                setEditingProject(null);
            } else {
                const errorData = await res.json();
                setError(errorData.message || "Failed to update project");
            }
        } catch {
            setError("Server error while updating project");
        }
    };

    const handleAddMember = (member: { username: string, email: string }) => {
        setFormData(prev => {
            const existingMembers = prev.teamMembers || [];
            if (existingMembers.includes(member.username)) {
                return prev;
            }
            return {
                ...prev,
                teamMembers: [...existingMembers, member.username]
            };
        });
        setMemberSearchQuery(member.username);
        setSearchResults([]);
        setShowMemberSearch(false);
        setTimeout(() => {
            setMemberSearchQuery("");
        }, 300);
    };

    const handleRemoveMember = (memberToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            teamMembers: prev.teamMembers.filter(member => member !== memberToRemove)
        }));
    };

    const handleCloseModal = () => {
        setEditModalOpen(false);
        setEditingProject(null);
        setFormData({
            name: "",
            objective: "",
            description: "",
            startDate: "",
            targetEndDate: "",
            teamMembers: []
        });
    };

    return (
        <div className={styles.root}>
            {/* Background Elements */}
            <div className={styles.bgWrapper}>
                <div className={styles.bgGradient} />
                <div className={styles.gridOverlay} />
            </div>

            <motion.div 
                className={styles.container}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.titleSection}>
                        <motion.h1 
                            className={styles.pageTitle}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            My Projects
                        </motion.h1>
                        <motion.p 
                            className={styles.pageSubtitle}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                        >
                            Manage your workspaces and track progress
                        </motion.p>
                    </div>
                    <Link to="/create-project" className={styles.createBtn}>
                        <Add /> New Project
                    </Link>
                </div>

                {error && <p style={{ color: '#ff5252', marginBottom: 20 }}>{error}</p>}

                {loading ? (
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner} />
                    </div>
                ) : (
                    <div className={styles.projectsGrid}>
                        {projects.length === 0 ? (
                            <motion.div 
                                className={styles.emptyState}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <FolderOpen className={styles.emptyIcon} />
                                <h3 className={styles.emptyTitle}>No projects yet</h3>
                                <p className={styles.emptyText}>Create your first project to get started with Nexus.</p>
                                <Link to="/create-project" className={styles.createBtn} style={{ display: 'inline-flex' }}>
                                    Create Project
                                </Link>
                            </motion.div>
                        ) : (
                            projects.map((project, index) => (
                                <motion.div
                                    key={project._id}
                                    className={styles.projectCard}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    onClick={(e) => {
                                        // Prevent navigation if clicking action buttons
                                        if ((e.target as HTMLElement).closest(`.${styles.cardActions}`)) return;
                                        navigate(`/projects/${project._id}`);
                                    }}
                                >
                                    <div className={styles.cardHeader}>
                                        <div className={styles.projectIcon}>
                                            <FolderOpen />
                                        </div>
                                        <span className={`${styles.statusBadge} ${styles.statusActive}`}>
                                            Active
                                        </span>
                                    </div>
                                    
                                    <h3 className={styles.projectName}>{project.name}</h3>
                                    <p className={styles.projectDesc}>
                                        {project.objective || "No objective defined."}
                                    </p>
                                    
                                    <div className={styles.cardFooter}>
                                        <div className={styles.teamStack}>
                                            {project.teamMembers && project.teamMembers.length > 0 ? (
                                                project.teamMembers.slice(0, 3).map((member, i) => (
                                                    <div key={i} className={styles.teamAvatar} title={member}>
                                                        {member.charAt(0).toUpperCase()}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className={styles.teamAvatar}><Person fontSize="small" /></div>
                                            )}
                                            {project.teamMembers && project.teamMembers.length > 3 && (
                                                <div className={styles.teamAvatar} style={{ background: '#0072ff' }}>
                                                    +{project.teamMembers.length - 3}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className={styles.dateInfo}>
                                            <AccessTime fontSize="small" />
                                            <span>{new Date(project.targetEndDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    {canEditProject(project) && (
                                        <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                type="button"
                                                className={`${styles.actionBtn} ${styles.editBtn}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditProject(project);
                                                }}
                                            >
                                                <Edit fontSize="small" style={{ marginRight: 4, verticalAlign: 'text-bottom' }} /> Edit
                                            </button>
                                            <button 
                                                type="button"
                                                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteProject(project._id, project.name);
                                                }}
                                            >
                                                <Delete fontSize="small" style={{ marginRight: 4, verticalAlign: 'text-bottom' }} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>
                )}

                {/* Edit Project Modal */}
                {editModalOpen && (
                    <div className={styles.modalOverlay} onClick={handleCloseModal}>
                        <motion.div 
                            className={styles.modal} 
                            onClick={e => e.stopPropagation()}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                            <div className={styles.modalHeader}>
                                <h2>Edit Project</h2>
                                <button className={styles.closeButton} onClick={handleCloseModal}>×</button>
                            </div>

                            <div className={styles.modalContent}>
                                <div className={styles.formRowThree}>
                                    <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                        <label className={styles.formLabel}>Project Name</label>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            value={formData.name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Enter project name"
                                        />
                                    </div>

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
                                      <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                          <label className={styles.formLabel}>Start Date</label>
                                          <DatePicker
                                              className={styles.formInput}
                                              value={formData.startDate ? dayjs(formData.startDate) : null}
                                              onChange={(date) => setFormData(prev => ({ ...prev, startDate: date ? date.format('YYYY-MM-DD') : '' }))}
                                              style={{ width: '100%', padding: '14px 18px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#fff', height: '48px' }}
                                              format="YYYY-MM-DD"
                                          />
                                      </div>

                                      <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                          <label className={styles.formLabel}>Target End Date</label>
                                          <DatePicker
                                              className={styles.formInput}
                                              value={formData.targetEndDate ? dayjs(formData.targetEndDate) : null}
                                              onChange={(date) => setFormData(prev => ({ ...prev, targetEndDate: date ? date.format('YYYY-MM-DD') : '' }))}
                                              style={{ width: '100%', padding: '14px 18px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#fff', height: '48px' }}
                                              format="YYYY-MM-DD"
                                          />
                                      </div>
                                    </ConfigProvider>
                                </div>

                                <div className={styles.formRow}>
                                    <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                        <label className={styles.formLabel}>Objective</label>
                                        <textarea
                                            className={styles.formTextarea}
                                            value={formData.objective}
                                            onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))}
                                            placeholder="Describe project objective"
                                            rows={4}
                                        />
                                    </div>

                                    <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                                        <label className={styles.formLabel}>Description</label>
                                        <textarea
                                            className={styles.formTextarea}
                                            value={formData.description}
                                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Describe project scope and details"
                                            rows={4}
                                        />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Team Members</label>
                                    <div className={styles.searchContainer}>
                                        <input
                                            className={styles.formInput}
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
                                                            onMouseDown={() => handleAddMember(user)}
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
                                    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap' }}>
                                        {formData.teamMembers.map((member, index) => (
                                            <div key={index} className={styles.selectedMember}>
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

                                <div className={styles.modalActions}>
                                    <button className={styles.cancelBtn} onClick={handleCloseModal}>Cancel</button>
                                    <button className={styles.saveBtn} onClick={handleSaveProject}>Save Changes</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default MyProjectsPage;
