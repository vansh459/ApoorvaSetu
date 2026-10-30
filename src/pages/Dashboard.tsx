import React from 'react';
import { useAuth } from '../context/AuthContext';
import { SuperAdminDashboard } from '../components/dashboard/roles/SuperAdminDashboard';
import { AICTEAdminDashboard } from '../components/dashboard/roles/AICTEAdminDashboard';
import { RegionalOfficerDashboard } from '../components/dashboard/roles/RegionalOfficerDashboard';
import { EVCMemberDashboard } from '../components/dashboard/roles/EVCMemberDashboard';
import { InstitutionAdminDashboard } from '../components/dashboard/roles/InstitutionAdminDashboard';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Dynamically render role-specific dashboard with distinct components, stats, and workflows
  switch (user?.role) {
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
      return <AICTEAdminDashboard />;
  }
};
