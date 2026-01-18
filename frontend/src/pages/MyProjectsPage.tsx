import React, { useEffect, useState } from "react";
import { Button } from "@mui/material";
import { useNavigate, Link } from "react-router-dom";
import styles from "../styles/MyProjectsPage.module.css";
import { useUser } from "../contexts/UserContext";

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
                console.log('Current user:', user);
                console.log('Fetching projects...');
                
                const res = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/projects`,
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem("nexus_jwt")}`,
                        },
                    }
                );
                const data = await res.json();
                console.log('API Response:', data);
                
                if (!res.ok) {
                    console.error('API Error:', data.message);
                    setError(data.message || "Failed to fetch projects");
                } else {
                    console.log('All projects from API:', data.projects);
                    
                    // Filter projects to show only those where user is owner or team member
                    const userProjects = (data.projects || []).filter((project: Project) => {
                        const isOwner = isProjectOwner(project);
                        const isMember = isProjectMember(project);
                        console.log(`Project ${project.name}:`, {
                            createdBy: project.createdBy,
                            teamMembers: project.teamMembers,
                            isOwner,
                            isMember,
                            currentUsername: user?.username
                        });
                        return isOwner || isMember;
                    });
                    console.log('Filtered projects for user:', userProjects);
                    setProjects(userProjects);
                }
            } catch (error) {
                console.error('Fetch error:', error);
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
                    body: JSON.stringify(formData),
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

    // Remove click-outside handler - using onBlur instead

    const handleAddMember = (member: { username: string, email: string }) => {
        // Check if member already exists
        setFormData(prev => {
            const existingMembers = prev.teamMembers || [];
            if (existingMembers.includes(member.username)) {
                // Member already exists, don't add again
                return prev;
            }

            return {
                ...prev,
                teamMembers: [...existingMembers, member.username]
            };
        });

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
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>My Projects</h1>
                <Button
                    variant="contained"
                    onClick={() => navigate("/create-project")}
                    sx={{ background: "#0072ff" }}
                >
                    + Create Project
                </Button>
            </div>

            {loading && <p className={styles.loading}>Loading...</p>}
            {error && <p className={styles.error}>{error}</p>}
            {!loading && projects.length === 0 && (
                <p className={styles.empty}>No projects found.</p>
            )}

            {!loading && projects.length > 0 &&
                projects.map((project) => (
                    <div key={project._id} className={styles.projectCard}>
                        <div className={styles.projectContent}>
                            <Link
                                to={`/projects/${project._id}`}
                                className={styles.projectLink}
                            >
                                <div className={styles.projectName}>{project.name}</div>
                                <div className={styles.objective}>{project.objective}</div>

                                <div className={styles.metaGrid}>
                                    <div className={styles.metaItem}>
                                        <div className={styles.metaLabel}>Start</div>
                                        {new Date(project.startDate).toLocaleDateString()}
                                    </div>

                                    <div className={styles.metaItem}>
                                        <div className={styles.metaLabel}>End</div>
                                        {new Date(project.targetEndDate).toLocaleDateString()}
                                    </div>

                                    <div className={styles.metaItem}>
                                        <div className={styles.metaLabel}>Team</div>
                                        {project.teamMembers?.length || 0} members
                                    </div>
                                </div>
                            </Link>

                            <div className={styles.projectActions}>
                                {(() => {
                                    const canEdit = canEditProject(project);
                                    console.log(`Project ${project.name} - Can edit:`, canEdit, 'User:', user?.username, 'Owner:', project.createdBy);
                                    return canEdit;
                                })() && (
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => handleEditProject(project)}
                                        sx={{
                                            borderColor: "#0072ff",
                                            color: "#0072ff",
                                            mr: 1,
                                            '&:hover': {
                                                borderColor: "#0056cc",
                                                backgroundColor: "rgba(0, 114, 255, 0.04)"
                                            }
                                        }}
                                    >
                                        Edit
                                    </Button>
                                )}
                                {canEditProject(project) && (
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => handleDeleteProject(project._id, project.name)}
                                        sx={{
                                            borderColor: "#dc3545",
                                            color: "#dc3545",
                                            '&:hover': {
                                                borderColor: "#c82333",
                                                backgroundColor: "rgba(220, 53, 69, 0.04)"
                                            }
                                        }}
                                    >
                                        Delete
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            }

            {/* Edit Project Modal */}
            {editModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>Edit Project</h2>
                            <button className={styles.closeButton} onClick={handleCloseModal}>
                                ×
                            </button>
                        </div>

                        <div className={styles.modalContent}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Project Name</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Enter project name"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Objective</label>
                                <textarea
                                    className={styles.formTextarea}
                                    value={formData.objective}
                                    onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))}
                                    placeholder="Describe project objective"
                                    rows={3}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Description</label>
                                <textarea
                                    className={styles.formTextarea}
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Describe project scope and details"
                                    rows={4}
                                />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Start Date</label>
                                    <input
                                        type="date"
                                        className={styles.formInput}
                                        value={formData.startDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Target End Date</label>
                                    <input
                                        type="date"
                                        className={styles.formInput}
                                        value={formData.targetEndDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, targetEndDate: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Team Members</label>
                                <div className={styles.memberManagement}>
                                    <div className={styles.memberInput}>
                                        <input
                                            type="text"
                                            className={styles.formInput}
                                            value={memberSearchQuery}
                                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                                            onFocus={() => setShowMemberSearch(true)}
                                            onBlur={() => setTimeout(() => setShowMemberSearch(false), 200)}
                                            placeholder="Search users by username or email"
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
                                    <div className={styles.memberList}>
                                        {formData.teamMembers.map((member, index) => (
                                            <div key={index} className={styles.memberChip}>
                                                <span>{member}</span>
                                                <button
                                                    className={styles.removeMember}
                                                    onClick={() => handleRemoveMember(member)}
                                                    title="Remove member"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <Button
                                variant="outlined"
                                onClick={handleCloseModal}
                                sx={{
                                    borderColor: "#6c757d",
                                    color: "#6c757d",
                                    mr: 1
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleSaveProject}
                                sx={{ background: "#0072ff" }}
                            >
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyProjectsPage;
