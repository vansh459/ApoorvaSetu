import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { DashboardLayout } from './layouts/DashboardLayout';
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

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/institutes" element={<Institutes />} />
            <Route path="/workflow" element={<Workflow />} />
            <Route path="/evc-scheduling" element={<EVCScheduling />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/regions-officials" element={<RegionsOfficials />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
