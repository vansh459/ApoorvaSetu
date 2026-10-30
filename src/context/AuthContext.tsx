import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, Permission } from '../types';
import { authService } from '../services/authService';
import { hasPermission as checkPermission, hasAnyRole } from '../services/rbacService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (roles: UserRole[]) => boolean;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Authoritative session verification directly from server session registry & backend user store
  const verifySession = useCallback(() => {
    try {
      const validatedUser = authService.validateSession();
      setUser(validatedUser);
      return validatedUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  // Initialize and verify session on initial mount
  useEffect(() => {
    verifySession();
    setIsLoading(false);

    // Listen to browser BFCache restoration and history popstate
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted || !authService.isSessionValid()) {
        verifySession();
      }
    };

    // Listen to tab storage synchronization
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'apoorvasetu_auth_session_v1' || e.key === 'apoorvasetu_server_sessions_v1') {
        verifySession();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [verifySession]);

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

  const hasPermission = (permission: Permission): boolean => {
    return checkPermission(user, permission);
  };

  const hasRole = (roles: UserRole[]): boolean => {
    return hasAnyRole(user, roles);
  };

  const refreshUser = () => {
    verifySession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
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
