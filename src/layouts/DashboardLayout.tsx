import React, { useState, useEffect } from 'react';import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { Header } from '../components/common/Header';
import { ToastContainer } from '../components/common/Toast';
import { ScheduleEVCModal } from '../components/modals/ScheduleEVCModal';
import { TrackApplicationModal } from '../components/modals/TrackApplicationModal';
import { UploadComplianceModal } from '../components/modals/UploadComplianceModal';
import { ApplicationDetailModal } from '../components/modals/ApplicationDetailModal';
import { GenerateReportModal } from '../components/modals/GenerateReportModal';
import { CaseSummaryDrawer } from '../components/modals/CaseSummaryDrawer';
import { AIHelpdeskAssistant } from '../components/assistant/AIHelpdeskAssistant';

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const location = useLocation();
  const navType = useNavigationType();

  // Scroll to top on standard link clicks (PUSH), preserve scroll on browser back/forward (POP)
  useEffect(() => {
    if (navType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, navType]);

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      {/* Persistent Left Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Top Header */}
        <Header
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          assistantOpen={assistantOpen}
          onToggleAssistant={() => setAssistantOpen((open) => !open)}
        />

        {/* Page View */}
        <main className="mx-auto w-full max-w-app flex-1 px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-10 2xl:px-16">
          <div key={location.pathname} className="page-enter w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <ScheduleEVCModal />
      <TrackApplicationModal />
      <UploadComplianceModal />
      <ApplicationDetailModal />
      <GenerateReportModal />
      <CaseSummaryDrawer />

      {/* Toast notifications */}
      <ToastContainer />

      {/* AI Helpdesk Assistant */}
      <AIHelpdeskAssistant isOpen={assistantOpen} onOpenChange={setAssistantOpen} />
    </div>
  );
};
