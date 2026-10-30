import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Application,
  Institute,
  EVCVisit,
  ComplianceRecord,
  DocumentItem,
  NotificationItem,
  ApplicationStage,
  ApplicationStatus
} from '../types';
import {
  initialApplications,
  initialInstitutes,
  initialEVCVisits,
  initialComplianceRecords,
  initialDocuments,
  initialNotifications
} from '../data/initialData';

interface ToastInfo {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface AppContextType {
  applications: Application[];
  institutes: Institute[];
  evcVisits: EVCVisit[];
  complianceRecords: ComplianceRecord[];
  documents: DocumentItem[];
  notifications: NotificationItem[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedApplication: Application | null;
  setSelectedApplication: (app: Application | null) => void;
  selectedInstitute: Institute | null;
  setSelectedInstitute: (inst: Institute | null) => void;
  activeModal: 'schedule-evc' | 'track-app' | 'upload-compliance' | 'app-detail' | 'inst-detail' | 'generate-report' | null;
  setActiveModal: (modal: 'schedule-evc' | 'track-app' | 'upload-compliance' | 'app-detail' | 'inst-detail' | 'generate-report' | null) => void;
  
  // Actions
  updateApplicationStage: (appId: string, newStage: ApplicationStage, status?: ApplicationStatus, note?: string) => void;
  advanceApplication: (appId: string) => void;
  returnApplication: (appId: string, reason: string) => void;
  approveApplication: (appId: string) => void;
  rejectApplication: (appId: string, reason: string) => void;
  addNewApplication: (app: Partial<Application>) => void;
  
  scheduleEVC: (visit: Omit<EVCVisit, 'id'>) => void;
  cancelEVC: (id: string) => void;
  rescheduleEVC: (id: string, newDate: string) => void;
  
  uploadCompliance: (record: Omit<ComplianceRecord, 'id'>) => void;
  verifyCompliance: (id: string) => void;
  
  uploadDocument: (doc: Omit<DocumentItem, 'id'>) => void;
  
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  
  toasts: ToastInfo[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  
  resetToInitialData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'aicte_approval_system_data_v2';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [applications, setApplications] = useState<Application[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_apps`);
    return saved ? JSON.parse(saved) : initialApplications;
  });

  const [institutes, setInstitutes] = useState<Institute[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_institutes`);
    return saved ? JSON.parse(saved) : initialInstitutes;
  });

  const [evcVisits, setEvcVisits] = useState<EVCVisit[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_evc`);
    return saved ? JSON.parse(saved) : initialEVCVisits;
  });

  const [complianceRecords, setComplianceRecords] = useState<ComplianceRecord[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_compliance`);
    return saved ? JSON.parse(saved) : initialComplianceRecords;
  });

  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_docs`);
    return saved ? JSON.parse(saved) : initialDocuments;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_notifs`);
    return saved ? JSON.parse(saved) : initialNotifications;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedInstitute, setSelectedInstitute] = useState<Institute | null>(null);
  const [activeModal, setActiveModal] = useState<'schedule-evc' | 'track-app' | 'upload-compliance' | 'app-detail' | 'inst-detail' | 'generate-report' | null>(null);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_apps`, JSON.stringify(applications));
  }, [applications]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_institutes`, JSON.stringify(institutes));
  }, [institutes]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_evc`, JSON.stringify(evcVisits));
  }, [evcVisits]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_compliance`, JSON.stringify(complianceRecords));
  }, [complianceRecords]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_docs`, JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_notifs`, JSON.stringify(notifications));
  }, [notifications]);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const stageOrder: ApplicationStage[] = [
    'Submitted',
    'Scrutiny / Re-scrutiny',
    'Expert Visit Committee (EVC)',
    'SAC / SHC',
    'Approval (Subject to Undertaking)',
    'Final Approval'
  ];

  const updateApplicationStage = (
    appId: string,
    newStage: ApplicationStage,
    newStatus: ApplicationStatus = 'In Progress',
    note?: string
  ) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        
        const updatedTimeline = [...app.timeline];
        const currentStageIdx = updatedTimeline.findIndex((t) => t.stage === app.stage);
        if (currentStageIdx >= 0) {
          updatedTimeline[currentStageIdx] = {
            ...updatedTimeline[currentStageIdx],
            status: 'completed',
            notes: note || updatedTimeline[currentStageIdx].notes
          };
        }

        const nextStageIdx = updatedTimeline.findIndex((t) => t.stage === newStage);
        if (nextStageIdx >= 0) {
          updatedTimeline[nextStageIdx] = {
            ...updatedTimeline[nextStageIdx],
            date: dateStr,
            status: 'current',
            notes: note || `Stage updated to ${newStage}`
          };
        }

        return {
          ...app,
          stage: newStage,
          status: newStatus,
          lastUpdated: dateStr,
          timeline: updatedTimeline,
          remarks: note || app.remarks
        };
      })
    );
    showToast(`Application ${appId} transitioned to ${newStage}`, 'success');
  };

  const advanceApplication = (appId: string) => {
    const app = applications.find((a) => a.id === appId);
    if (!app) return;
    const currentIdx = stageOrder.indexOf(app.stage);
    if (currentIdx < stageOrder.length - 1) {
      const nextStage = stageOrder[currentIdx + 1];
      const nextStatus: ApplicationStatus = nextStage === 'Final Approval' ? 'Approved' : 'In Progress';
      updateApplicationStage(appId, nextStage, nextStatus, `Advanced forward in the approval pipeline.`);
    } else {
      showToast(`Application is already at final approval stage.`, 'info');
    }
  };

  const returnApplication = (appId: string, reason: string) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        return {
          ...app,
          status: 'Returned',
          remarks: `Returned for correction: ${reason}`,
          lastUpdated: dateStr
        };
      })
    );
    showToast(`Application ${appId} returned for institution corrections.`, 'warning');
  };

  const approveApplication = (appId: string) => {
    updateApplicationStage(appId, 'Final Approval', 'Approved', 'Final approval granted by AICTE Competent Authority.');
    showToast(`Application ${appId} approved successfully!`, 'success');
  };

  const rejectApplication = (appId: string, reason: string) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        return {
          ...app,
          status: 'Rejected',
          remarks: `Application rejected: ${reason}`,
          lastUpdated: dateStr
        };
      })
    );
    showToast(`Application ${appId} has been rejected.`, 'error');
  };

  const addNewApplication = (appData: Partial<Application>) => {
    const newId = `AICTE/2025/${Math.floor(12877 + Math.random() * 900)}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const newApp: Application = {
      id: newId,
      instituteId: appData.instituteId || 'INST-101',
      instituteName: appData.instituteName || 'New Institution',
      type: appData.type || 'Extension of Approval (EoA)',
      region: appData.region || 'Northern',
      state: appData.state || 'Delhi',
      stage: 'Submitted',
      status: 'In Progress',
      lastUpdated: dateStr,
      appliedDate: dateStr,
      category: appData.category || 'Engineering & Technology',
      intakeProposed: appData.intakeProposed || 300,
      programs: appData.programs || ['Computer Engineering'],
      contactEmail: appData.contactEmail || 'contact@inst.edu',
      contactPhone: appData.contactPhone || '+91 90000 00000',
      remarks: 'Application submitted via portal.',
      documents: [
        { name: 'Application Form', type: 'PDF', status: 'Pending', uploadedOn: dateStr }
      ],
      timeline: [
        { stage: 'Submitted', date: dateStr, status: 'completed', notes: 'Initial filing completed.' },
        { stage: 'Scrutiny / Re-scrutiny', date: 'Pending', status: 'pending' },
        { stage: 'Expert Visit Committee (EVC)', date: 'Pending', status: 'pending' },
        { stage: 'SAC / SHC', date: 'Pending', status: 'pending' },
        { stage: 'Approval (Subject to Undertaking)', date: 'Pending', status: 'pending' },
        { stage: 'Final Approval', date: 'Pending', status: 'pending' }
      ]
    };

    setApplications((prev) => [newApp, ...prev]);
    showToast(`New Application ${newId} registered successfully!`, 'success');
  };

  const scheduleEVC = (visitData: Omit<EVCVisit, 'id'>) => {
    const id = `EVC-${Math.floor(8810 + Math.random() * 900)}`;
    const newVisit: EVCVisit = {
      ...visitData,
      id
    };
    setEvcVisits((prev) => [newVisit, ...prev]);

    // Add a corresponding notification
    const newNotif: NotificationItem = {
      id: `NOTIF-${Date.now()}`,
      title: `EVC Visit Scheduled: ${visitData.instituteName}`,
      description: `Committee ${visitData.assignedCommittee} assigned for ${visitData.displayDate.day} ${visitData.displayDate.month}.`,
      category: 'evc',
      timestamp: 'Just now',
      read: false,
      priority: 'high',
      link: '/evc-scheduling'
    };
    setNotifications((prev) => [newNotif, ...prev]);

    showToast(`EVC Visit scheduled for ${visitData.instituteName}`, 'success');
  };

  const cancelEVC = (id: string) => {
    setEvcVisits((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: 'Cancelled' } : v))
    );
    showToast(`EVC Visit ${id} has been cancelled`, 'info');
  };

  const rescheduleEVC = (id: string, newDate: string) => {
    const parts = newDate.split('-');
    const dateObj = new Date(newDate);
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = dateObj.toLocaleString('en-US', { month: 'short' });

    setEvcVisits((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              date: newDate,
              displayDate: { day, month },
              status: 'Scheduled'
            }
          : v
      )
    );
    showToast(`EVC Visit ${id} rescheduled to ${day} ${month}`, 'success');
  };

  const uploadCompliance = (recordData: Omit<ComplianceRecord, 'id'>) => {
    const id = `CMP-${Math.floor(200 + Math.random() * 800)}`;
    const newRecord: ComplianceRecord = {
      ...recordData,
      id
    };
    setComplianceRecords((prev) => [newRecord, ...prev]);
    showToast(`Compliance submission uploaded for ${recordData.instituteName}`, 'success');
  };

  const verifyCompliance = (id: string) => {
    setComplianceRecords((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'Verified', urgency: 'low' } : c))
    );
    showToast(`Compliance record ${id} marked as Verified!`, 'success');
  };

  const uploadDocument = (docData: Omit<DocumentItem, 'id'>) => {
    const id = `DOC-${Math.floor(600 + Math.random() * 400)}`;
    const newDoc: DocumentItem = {
      ...docData,
      id
    };
    setDocuments((prev) => [newDoc, ...prev]);
    showToast(`Document "${docData.title}" uploaded successfully!`, 'success');
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('All notifications marked as read', 'info');
  };

  const resetToInitialData = () => {
    localStorage.removeItem(`${STORAGE_KEY}_apps`);
    localStorage.removeItem(`${STORAGE_KEY}_institutes`);
    localStorage.removeItem(`${STORAGE_KEY}_evc`);
    localStorage.removeItem(`${STORAGE_KEY}_compliance`);
    localStorage.removeItem(`${STORAGE_KEY}_docs`);
    localStorage.removeItem(`${STORAGE_KEY}_notifs`);

    setApplications(initialApplications);
    setInstitutes(initialInstitutes);
    setEvcVisits(initialEVCVisits);
    setComplianceRecords(initialComplianceRecords);
    setDocuments(initialDocuments);
    setNotifications(initialNotifications);
    showToast('Reset to original sample data', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        applications,
        institutes,
        evcVisits,
        complianceRecords,
        documents,
        notifications,
        searchQuery,
        setSearchQuery,
        selectedApplication,
        setSelectedApplication,
        selectedInstitute,
        setSelectedInstitute,
        activeModal,
        setActiveModal,
        updateApplicationStage,
        advanceApplication,
        returnApplication,
        approveApplication,
        rejectApplication,
        addNewApplication,
        scheduleEVC,
        cancelEVC,
        rescheduleEVC,
        uploadCompliance,
        verifyCompliance,
        uploadDocument,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        toasts,
        showToast,
        removeToast,
        resetToInitialData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
