import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { Permission, UserRole } from '../../types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

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

  // Active server-side session verification check
  const isServerValid = authService.isSessionValid();

  useEffect(() => {
    // If client state thinks authenticated, but backend session is missing/revoked, force logout
    if (isAuthenticated && !isServerValid) {
      logout();
    }
  }, [isAuthenticated, isServerValid, logout]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center mb-4">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Verifying Security Credentials...
        </p>
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
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          403 — Unauthorized Role Access
        </h2>
        <p className="text-sm text-slate-500 max-w-md mt-1.5 mb-6">
          Your current authenticated role (<strong className="text-slate-800">{user.roleTitle}</strong>) does not have authorization to view this module.
        </p>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Authorized Dashboard</span>
        </button>
      </div>
    );
  }

  // Check permission authorization if restricted to specific permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          403 — Permission Denied
        </h2>
        <p className="text-sm text-slate-500 max-w-md mt-1.5 mb-6">
          Missing required security permission: <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">{requiredPermission}</code>.
        </p>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Authorized Dashboard</span>
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Route guard that prevents already authenticated users from viewing the login screen.
 * Automatically forwards authenticated sessions to the role dashboard.
 */
export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const isServerValid = authService.isSessionValid();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070e1b] flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated && isServerValid) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
