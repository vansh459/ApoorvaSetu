import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Permission } from '../types';
import { authService, AuthSession, DEMO_PASSWORD } from '../services/authService';
import { hasPermission as checkPermission, hasAnyRole } from '../services/rbacService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User>;
  logout: () => void;
  switchRole: (role: UserRole) => Promise<User>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (roles: UserRole[]) => boolean;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth session on mount
  useEffect(() => {
    try {
      const session = authService.getSession();
      if (session) {
        setUser(session.user);
      } else {
        // Auto-seed default user as AICTE_ADMIN or SUPER_ADMIN if none logged in for seamless dev evaluation
        // But prompt says: "After successful authentication: Verify user credentials. Retrieve the user's assigned role..."
        // Default to a default session or null (redirects to /login)
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, rememberMe = false): Promise<User> => {
    setIsLoading(true);
    try {
      const session = await authService.login(email, password, rememberMe);
      setUser(session.user);
      return session.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const switchRole = async (role: UserRole): Promise<User> => {
    setIsLoading(true);
    try {
      const newUser = await authService.switchDemoRole(role);
      setUser(newUser);
      return newUser;
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    return checkPermission(user, permission);
  };

  const hasRole = (roles: UserRole[]): boolean => {
    return hasAnyRole(user, roles);
  };

  const refreshUser = () => {
    const current = authService.getCurrentUser();
    setUser(current);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        switchRole,
        hasPermission,
        hasRole,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

