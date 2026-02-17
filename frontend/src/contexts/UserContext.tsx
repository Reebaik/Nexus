import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isProjectOwner: (project: any) => boolean;
  isProjectMember: (project: any) => boolean;
  canEditProject: (project: any) => boolean;
  canEditTask: (task: any) => boolean;
  canUpdateTaskStatus: (task: any) => boolean;
  canEditRequirements: (project: any) => boolean;
  getCurrentUsername: () => string;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get user info from JWT token or localStorage
    const token = localStorage.getItem('nexus_jwt');
    console.log('UserContext: JWT token found:', !!token);
    
    if (token) {
      try {
        // For now, we'll store username in localStorage
        // In a real app, you'd decode the JWT or make an API call
        const storedUser = localStorage.getItem('nexus_user');
        console.log('UserContext: Stored user data:', storedUser);
        
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          console.log('UserContext: Parsed user:', parsedUser);
          setUser(parsedUser);
        } else {
          console.log('UserContext: No stored user data found');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    } else {
      console.log('UserContext: No JWT token found');
    }
  }, []);

  const getCurrentUsername = (): string => {
    return user?.username || '';
  };

  const isProjectOwner = (project: any): boolean => {
    if (!user || !project) return false;
    
    // Handle both populated and non-populated createdBy field
    if (typeof project.createdBy === 'object' && project.createdBy?.username) {
      return project.createdBy.username === user.username;
    } else if (typeof project.createdBy === 'string') {
      return project.createdBy === user.id;
    }
    
    return false;
  };

  const isProjectMember = (project: any): boolean => {
    if (!user || !project) return false;
    return project.teamMembers?.includes(user.username) || isProjectOwner(project);
  };

  const canEditProject = (project: any): boolean => {
    return isProjectOwner(project);
  };

  const canEditTask = (task: any): boolean => {
    if (!user || !task) return false;
    return task.assignee === user.username;
  };

  const canUpdateTaskStatus = (task: any): boolean => {
    return canEditTask(task);
  };

  const canEditRequirements = (project: any): boolean => {
    return isProjectOwner(project);
  };

  const value: UserContextType = {
    user,
    setUser,
    isProjectOwner,
    isProjectMember,
    canEditProject,
    canEditTask,
    canUpdateTaskStatus,
    canEditRequirements,
    getCurrentUsername,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
