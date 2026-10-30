import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute, PublicRoute } from './components/common/ProtectedRoute';

// Auth page
import { Login } from './pages/auth/Login';

// Common pages
import { Dashboard } from './pages/Dashboard';
import { Applications } from './pages/Applications';
import { Institutes } from './pages/Institutes';
import { Workflow } from './pages/Workflow';
import { EVCScheduling } from './pages/EVCScheduling';
import { Compliance } from './pages/Compliance';
import { Documents } from './pages/Documents';
import { RegionsOfficials } from './pages/RegionsOfficials';
import { Reports } from './pages/Reports';
import { Notifications } from './pages/Notifications';

// Super Admin exclusive pages
import { UserManagement } from './pages/admin/UserManagement';
import { RolePermissions } from './pages/admin/RolePermissions';
import { AuditLogs } from './pages/admin/AuditLogs';
import { SystemConfigPage } from './pages/admin/SystemConfig';

// Regional Officer exclusive pages
import { RegionalEscalations } from './pages/regional/RegionalEscalations';

// EVC Committee Member exclusive pages
import { MyAssignedVisits } from './pages/evc/MyAssignedVisits';
import { InspectionChecklist } from './pages/evc/InspectionChecklist';
import { EvidenceUpload } from './pages/evc/EvidenceUpload';

// Institution Admin exclusive pages
import { InstitutionProfile } from './pages/institution/InstitutionProfile';
import { SubmitApplication } from './pages/institution/SubmitApplication';
import { ApplicationTracking } from './pages/institution/ApplicationTracking';

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Auth Route */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            {/* Authenticated Application Shell */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Dynamic Role-Dispatched Dashboard */}
              <Route path="/" element={<Dashboard />} />

              {/* Super Admin Routes */}
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/roles"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                    <RolePermissions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/system-config"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                    <SystemConfigPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                    <AuditLogs />
                  </ProtectedRoute>
                }
              />

              {/* Regional Officer Routes */}
              <Route
                path="/regional/escalations"
                element={
                  <ProtectedRoute allowedRoles={['REGIONAL_OFFICER', 'SUPER_ADMIN']}>
                    <RegionalEscalations />
                  </ProtectedRoute>
                }
              />

              {/* EVC Committee Member Routes */}
              <Route
                path="/evc/my-visits"
                element={
                  <ProtectedRoute allowedRoles={['EVC_MEMBER', 'SUPER_ADMIN']}>
                    <MyAssignedVisits />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/evc/checklist"
                element={
                  <ProtectedRoute allowedRoles={['EVC_MEMBER', 'SUPER_ADMIN']}>
                    <InspectionChecklist />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/evc/evidence"
                element={
                  <ProtectedRoute allowedRoles={['EVC_MEMBER', 'SUPER_ADMIN']}>
                    <EvidenceUpload />
                  </ProtectedRoute>
                }
              />

              {/* Institution Admin Routes */}
              <Route
                path="/institution/profile"
                element={
                  <ProtectedRoute allowedRoles={['INSTITUTION_ADMIN', 'SUPER_ADMIN']}>
                    <InstitutionProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/institution/apply"
                element={
                  <ProtectedRoute allowedRoles={['INSTITUTION_ADMIN', 'SUPER_ADMIN']}>
                    <SubmitApplication />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/institution/tracking"
                element={
                  <ProtectedRoute allowedRoles={['INSTITUTION_ADMIN', 'SUPER_ADMIN']}>
                    <ApplicationTracking />
                  </ProtectedRoute>
                }
              />

              {/* Core Regulatory & Operations Routes */}
              <Route
                path="/applications"
                element={
                  <ProtectedRoute requiredPermission="applications.read">
                    <Applications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/institutes"
                element={
                  <ProtectedRoute requiredPermission="institutes.read">
                    <Institutes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workflow"
                element={
                  <ProtectedRoute requiredPermission="workflow.manage">
                    <Workflow />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/evc-scheduling"
                element={
                  <ProtectedRoute requiredPermission="evc.read">
                    <EVCScheduling />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/compliance"
                element={
                  <ProtectedRoute requiredPermission="compliance.read">
                    <Compliance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/documents"
                element={
                  <ProtectedRoute requiredPermission="documents.read">
                    <Documents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/regions-officials"
                element={
                  <ProtectedRoute requiredPermission="workflow.manage">
                    <RegionsOfficials />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute requiredPermission="reports.read">
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route path="/notifications" element={<Notifications />} />

              {/* Fallback redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
