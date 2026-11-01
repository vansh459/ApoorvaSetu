import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
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
  const location = useLocation();
  const navType = useNavigationType();

  // Scroll to top on standard link clicks (PUSH), preserve scroll on browser back/forward (POP)
  useEffect(() => {
    if (navType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, navType]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex">
      {/* Persistent Left Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-300">
        {/* Top Header */}
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page View with Smooth 180ms Page Transition & Bottom Clearance for Floating Assistant */}
        <main className="flex-1 p-4 sm:p-5 lg:p-6 pb-24 sm:pb-28 max-w-[1650px] w-full mx-auto">
          <div key={location.pathname} className="animate-page-fade w-full">
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

      {/* Floating AI Helpdesk Assistant */}
      <AIHelpdeskAssistant />
    </div>
  );
};
