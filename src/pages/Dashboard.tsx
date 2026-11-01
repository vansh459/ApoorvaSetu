import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SuperAdminDashboard } from '../components/dashboard/roles/SuperAdminDashboard';
import { AICTEAdminDashboard } from '../components/dashboard/roles/AICTEAdminDashboard';
import { RegionalOfficerDashboard } from '../components/dashboard/roles/RegionalOfficerDashboard';
import { EVCMemberDashboard } from '../components/dashboard/roles/EVCMemberDashboard';
import { InstitutionAdminDashboard } from '../components/dashboard/roles/InstitutionAdminDashboard';

export const Dashboard: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
        <div className="h-32 animate-pulse rounded-modal bg-surface-2" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="h-28 animate-pulse rounded-card border border-line bg-surface-2" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-64 animate-pulse rounded-card border border-line bg-surface-2" />
          ))}
        </div>
      </div>
    );
  }

  // If session is unauthenticated, redirect strictly to login (never default to AICTE Admin)
  if (!isAuthenticated || !user || !user.role) {
    return <Navigate to="/login" replace />;
  }

  // Dynamically render role-specific dashboard strictly according to authenticated user role
  switch (user.role) {
    case 'SUPER_ADMIN':
      return <SuperAdminDashboard />;
    case 'AICTE_ADMIN':
      return <AICTEAdminDashboard />;
    case 'REGIONAL_OFFICER':
      return <RegionalOfficerDashboard />;
    case 'EVC_MEMBER':
      return <EVCMemberDashboard />;
    case 'INSTITUTION_ADMIN':
      return <InstitutionAdminDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
};
