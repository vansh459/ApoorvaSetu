import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { getDataMode } from '../../services/repositories';
import { Permission, UserRole } from '../../types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../ui';

const remoteAuthEnabled = getDataMode() === 'supabase';

function sessionValid(user: unknown): boolean {
  return remoteAuthEnabled ? Boolean(user) : authService.isSessionValid();
}

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredPermission?: Permission;
  allowedRoles?: UserRole[];
}

/**
 * Route guard that strictly prevents unauthenticated access to protected dashboards.
 * Verifies backend cryptographic session on every route navigation.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  allowedRoles
}) => {
  const { user, isAuthenticated, isLoading, logout, hasPermission, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Active session verification: Supabase Auth in production, signed demo session offline.
  const isServerValid = sessionValid(user);

  useEffect(() => {
    // If client state thinks authenticated, but backend session is missing/revoked, force logout
    if (isAuthenticated && !isServerValid && !isLoading) {
      logout();
    }
  }, [isAuthenticated, isServerValid, isLoading, logout]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper p-4">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-card border border-line bg-surface">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
        <p className="text-sm text-ink-2">Verifying your session…</p>
      </div>
    );
  }

  // If not authenticated or backend session is invalid, redirect strictly to /login
  if (!isAuthenticated || !user || !isServerValid) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization if restricted to specific roles
  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="mb-4 h-6 w-6 text-danger" strokeWidth={1.75} aria-hidden="true" />
        <h2 className="text-2xl font-semibold tracking-tight text-ink">
          You don’t have access to this page
        </h2>
        <p className="mt-2 mb-6 max-w-md text-sm leading-relaxed text-ink-2">
          Your role (<strong className="font-semibold text-ink">{user.roleTitle}</strong>) isn’t
          authorised for this module.
        </p>
        <Button icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/')}>
          Return to your dashboard
        </Button>
      </div>
    );
  }

  // Check permission authorization if restricted to specific permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="mb-4 h-6 w-6 text-warning" strokeWidth={1.75} aria-hidden="true" />
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Permission required</h2>
        <p className="mt-2 mb-6 max-w-md text-sm leading-relaxed text-ink-2">
          This module needs the{' '}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-ink">
            {requiredPermission}
          </code>{' '}
          permission.
        </p>
        <Button icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/')}>
          Return to your dashboard
        </Button>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

/**
 * Route guard that prevents already authenticated users from viewing the login screen.
 * Automatically forwards authenticated sessions to the role dashboard.
 */
export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const isServerValid = sessionValid(user);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-pill animate-spin" />
      </div>
    );
  }

  if (isAuthenticated && isServerValid) {
    const from = (location.state as any)?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};
