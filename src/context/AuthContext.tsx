import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, Permission } from '../types';
import { authService } from '../services/authService';
import { supabaseAuthService } from '../services/supabaseAuthService';
import { getDataMode } from '../services/repositories';
import { hasPermission as checkPermission, hasAnyRole } from '../services/rbacService';

const remoteAuthEnabled = getDataMode() === 'supabase';

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
  // Synchronously initialize authenticated user from backend session storage
  // Prevents blank screens, flashing, and false unauthenticated redirects during browser navigation
  const [user, setUser] = useState<User | null>(() => {
    if (remoteAuthEnabled) return null;
    try {
      return authService.validateSession();
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(remoteAuthEnabled);

  // Authoritative session verification directly from server session registry & backend user store
  const verifySession = useCallback(() => {
    if (remoteAuthEnabled) {
      void supabaseAuthService
        .getSessionUser()
        .then(setUser)
        .catch(() => setUser(null));
      return null;
    }
    try {
      const validatedUser = authService.validateSession();
      setUser(validatedUser);
      return validatedUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  // Supabase mode restores the Auth session asynchronously and tracks refreshes.
  useEffect(() => {
    if (!remoteAuthEnabled) return;
    let active = true;

    supabaseAuthService
      .getSessionUser()
      .then((remoteUser) => {
        if (active) setUser(remoteUser);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    const unsubscribe = supabaseAuthService.onAuthChange((remoteUser) => {
      if (active) setUser(remoteUser);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Listen for session invalidation, BFCache restoration, and history navigation
  useEffect(() => {
    if (remoteAuthEnabled) return;

    // Listen to browser BFCache restoration and history navigation
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted || !authService.isSessionValid()) {
        verifySession();
      }
    };

    // Listen to popstate (browser back/forward button clicks)
    const handlePopState = () => {
      verifySession();
    };

    // Listen to tab storage synchronization
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'apoorvasetu_auth_session_v1' || e.key === 'apoorvasetu_server_sessions_v1') {
        verifySession();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [verifySession]);

  const login = async (email: string, password: string, rememberMe = false): Promise<User> => {
    setIsLoading(true);
    try {
      if (remoteAuthEnabled) {
        const remoteUser = await supabaseAuthService.signIn(email, password);
        setUser(remoteUser);
        return remoteUser;
      }
      const session = await authService.login(email, password, rememberMe);
      setUser(session.user);
      return session.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (remoteAuthEnabled) {
      void supabaseAuthService.signOut();
    } else {
      authService.logout();
    }
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
