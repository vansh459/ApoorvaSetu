import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Application,
  Institute,
  EVCVisit,
  ComplianceRecord,
  DocumentItem,
  NotificationItem,
  ApplicationStage,
  ApplicationStatus,
  EscalationItem,
  EVCVisitChecklistItem,
  InspectionReport,
  Region,
  SystemAlert,
  Undertaking
} from '../types';
import {
  initialApplications,
  initialInstitutes,
  initialEVCVisits,
  initialComplianceRecords,
  initialDocuments,
  initialNotifications,
  initialUndertakings,
  regionalOffices
} from '../data/initialData';
import { getRandomFullName, getRandomAcademicName, getInitials } from '../utils/nameGenerator';
import { authService } from '../services/authService';
import { clearLocal, getDataMode, getRepository, readLocal, writeLocal } from '../services/repositories';
import { applyTransition, canTransition, normalizeApplication } from '../workflow/engine';
import { resolveWorkflowConfig } from '../workflow/config';
import { refreshApplicationSla } from '../workflow/sla';
import { resolveRoute, routeRequiresStage } from '../workflow/routes';
import { canonicalStage } from '../workflow/stages';
import { notificationsForEvent } from '../workflow/notifications';
import { sweepDeadlines } from '../workflow/alerts';
import { activeVisitFor, checklistProgress, linkLegacyVisits, normalizeEVCVisit } from '../workflow/evc';
import {
  buildUndertaking,
  getUndertakingCondition,
  planUndertakingsForApproval
} from '../workflow/undertakings';
import {
  buildRenewalRecord,
  canRequestRenewal,
  canSubmitRenewal,
  markRenewalRequested,
  markRenewalSubmitted,
  normalizeDocument,
  rejectRenewalInList,
  verifyDocumentInList
} from '../workflow/documents';
import { appendAudit, hydrateRemoteAuditLogs } from '../services/auditService';
import { useAuth } from './AuthContext';
import type {
  ActorRef,
  AuditDraft,
  DomainEvent,
  DomainEventType,
  TransitionRequest,
  TransitionResult,
  WorkflowContext
} from '../workflow/types';
import { computeDueDate, daysUntil, formatDisplayDate, getNow, parseDate, resetNow, setDemoTimeOffsetDays, toIsoDate } from '../utils/dates';

interface ToastInfo {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

// Remote mode mirrors these tables so another officer's write shows up without a reload.
const REMOTE_SYNC_TABLES = [
  'applications',
  'institutes',
  'evc_visits',
  'compliance_records',
  'documents',
  'notifications',
  'undertakings',
  'alerts',
  'escalations'
];

export interface UserProfile {
  name: string;
  role: string;
  email: string;
  initials: string;
}

interface AppContextType {
  currentUser: UserProfile;
  randomizeCurrentUser: () => void;
  randomizeAllNames: () => void;
  applications: Application[];
  institutes: Institute[];
  evcVisits: EVCVisit[];
  complianceRecords: ComplianceRecord[];
  documents: DocumentItem[];
  notifications: NotificationItem[];
  undertakings: Undertaking[];
  alerts: SystemAlert[];
  escalations: EscalationItem[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedApplication: Application | null;
  setSelectedApplication: (app: Application | null) => void;
  selectedInstitute: Institute | null;
  setSelectedInstitute: (inst: Institute | null) => void;
  activeModal: 'schedule-evc' | 'track-app' | 'upload-compliance' | 'app-detail' | 'inst-detail' | 'generate-report' | 'case-summary' | null;
  setActiveModal: (modal: 'schedule-evc' | 'track-app' | 'upload-compliance' | 'app-detail' | 'inst-detail' | 'generate-report' | 'case-summary' | null) => void;
  
  // Actions
  transitionApplication: (appId: string, request: Omit<TransitionRequest, 'actor'>) => TransitionResult;
  checkTransition: (appId: string, request: Omit<TransitionRequest, 'actor'>) => TransitionResult;
  updateApplicationStage: (appId: string, newStage: ApplicationStage, status?: ApplicationStatus, note?: string) => void;
  advanceApplication: (appId: string) => void;
  returnApplication: (appId: string, reason: string, reasonCode?: string) => void;
  approveApplication: (appId: string) => void;
  rejectApplication: (appId: string, reason: string, reasonCode?: string) => void;
  addNewApplication: (app: Partial<Application>) => void;
  
  scheduleEVC: (visit: Omit<EVCVisit, 'id'>) => boolean;
  cancelEVC: (id: string) => void;
  rescheduleEVC: (id: string, newDate: string) => void;
  completeEVC: (
    visitId: string,
    input: {
      infrastructureScore: number;
      facultyScore: number;
      labScore: number;
      safetyCompliance: boolean;
      recommendations: InspectionReport['recommendations'];
      remarks: string;
    }
  ) => boolean;
  saveVisitChecklist: (visitId: string, marks: EVCVisitChecklistItem[]) => void;
  addVisitEvidence: (visitId: string, title: string) => void;
  removeVisitEvidence: (visitId: string, title: string) => void;
  
  uploadCompliance: (record: Omit<ComplianceRecord, 'id'>) => void;
  verifyCompliance: (id: string) => void;
  createUndertaking: (input: {
    applicationId: string;
    conditionCode: string;
    dueDate?: string;
    note?: string;
  }) => boolean;
  submitUndertakingEvidence: (id: string, evidenceTitle: string) => boolean;
  verifyUndertaking: (id: string) => boolean;
  rejectUndertaking: (id: string, reason: string) => boolean;
  
  uploadDocument: (doc: Omit<DocumentItem, 'id'>) => boolean;
  requestDocumentRenewal: (id: string) => boolean;
  submitDocumentRenewal: (
    id: string,
    input: {
      expiryDate: string;
      fileSize?: string;
      fileType?: string;
      storagePath?: string;
      note?: string;
    }
  ) => boolean;
  verifyDocument: (id: string) => boolean;
  rejectDocument: (id: string, reason: string) => boolean;
  
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;

  demoClockOffsetDays: number;
  setDemoClockOffset: (days: number) => void;

  runSweep: () => void;
  acknowledgeAlert: (id: string) => void;
  resolveAlert: (id: string) => void;
  acknowledgeEscalation: (id: string) => void;
  resolveEscalation: (id: string) => void;
  createEscalation: (input: {
    applicationId: string;
    instituteName: string;
    region: Region;
    urgency: EscalationItem['urgency'];
    reason: string;
  }) => void;
  
  toasts: ToastInfo[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  
  resetToInitialData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const repository = getRepository();

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();
  const remoteUserId = repository.isRemote ? (authUser?.id ?? null) : null;

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = readLocal<UserProfile | null>('user', null);
    if (saved) return saved;
    const initialName = getRandomFullName();
    const initials = getInitials(initialName);
    const slug = initialName.toLowerCase().replace(/\s+/g, '.');
    return {
      name: initialName,
      role: 'Regional Officer',
      email: `${slug}@aicte-india.org`,
      initials
    };
  });

  const [applications, setApplications] = useState<Application[]>(() =>
    readLocal<Application[]>('applications', initialApplications).map((app) => normalizeApplication(app))
  );

  const [institutes, setInstitutes] = useState<Institute[]>(() =>
    readLocal<Institute[]>('institutes', initialInstitutes)
  );

  const [evcVisits, setEvcVisits] = useState<EVCVisit[]>(() =>
    readLocal<EVCVisit[]>('evcVisits', initialEVCVisits).map((visit) => normalizeEVCVisit(visit))
  );

  const [complianceRecords, setComplianceRecords] = useState<ComplianceRecord[]>(() =>
    readLocal<ComplianceRecord[]>('complianceRecords', initialComplianceRecords)
  );

  const [documents, setDocuments] = useState<DocumentItem[]>(() =>
    readLocal<DocumentItem[]>('documents', initialDocuments).map(normalizeDocument)
  );

  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    readLocal<NotificationItem[]>('notifications', initialNotifications)
  );

  const [undertakings, setUndertakings] = useState<Undertaking[]>(() => {
    const stored = readLocal<Undertaking[]>('undertakings', initialUndertakings);
    return stored.length ? stored : initialUndertakings;
  });

  const [alerts, setAlerts] = useState<SystemAlert[]>(() =>
    readLocal<SystemAlert[]>('alerts', [])
  );

  const [escalations, setEscalations] = useState<EscalationItem[]>(() =>
    readLocal<EscalationItem[]>('escalations', [])
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedInstitute, setSelectedInstitute] = useState<Institute | null>(null);
  const [activeModal, setActiveModal] = useState<'schedule-evc' | 'track-app' | 'upload-compliance' | 'app-detail' | 'inst-detail' | 'generate-report' | 'case-summary' | null>(null);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const [demoClockOffsetDays, setDemoClockOffsetDays] = useState(0);
  const [remoteRevision, setRemoteRevision] = useState(0);

  // Hydrate from the configured data source. Demo mode resolves synchronously above.
  useEffect(() => {
    if (!repository.isRemote || !remoteUserId) return;
    let isMounted = true;
    const loadRemoteData = async () => {
      try {
        const snapshot = await repository.loadRemote();
        if (!isMounted || !snapshot) return;
        authService.applyRemoteState({
          users: snapshot.users,
          rolePermissions: snapshot.rolePermissions,
          config: snapshot.config ?? null
        });
        if (snapshot.auditLogs) hydrateRemoteAuditLogs(snapshot.auditLogs);
        if (snapshot.applications !== undefined) {
          setApplications(snapshot.applications.map((app) => normalizeApplication(app)));
        }
        if (snapshot.institutes !== undefined) setInstitutes(snapshot.institutes);
        if (snapshot.evcVisits !== undefined) {
          setEvcVisits(snapshot.evcVisits.map((visit) => normalizeEVCVisit(visit)));
        }
        if (snapshot.complianceRecords !== undefined) {
          setComplianceRecords(snapshot.complianceRecords);
        }
        if (snapshot.documents !== undefined) {
          setDocuments(snapshot.documents.map(normalizeDocument));
        }
        if (snapshot.notifications !== undefined) setNotifications(snapshot.notifications);
        if (snapshot.undertakings !== undefined) setUndertakings(snapshot.undertakings);
        if (snapshot.alerts !== undefined) setAlerts(snapshot.alerts);
        if (snapshot.escalations !== undefined) setEscalations(snapshot.escalations);
      } catch (error) {
        console.warn('Remote data fetch failed, using local demo cache', error);
      }
    };
    loadRemoteData();
    return () => {
      isMounted = false;
    };
  }, [remoteRevision, remoteUserId]);

  // Coalesce bursts of row changes into one refresh; the sweep can write several tables at once.
  useEffect(() => {
    if (!repository.isRemote) return;
    let timer: number | undefined;
    const scheduleRefresh = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setRemoteRevision((value) => value + 1), 500);
    };
    const unsubscribers = REMOTE_SYNC_TABLES.map((table) =>
      repository.subscribe(table, scheduleRefresh)
    );
    return () => {
      if (timer) window.clearTimeout(timer);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  // Demo-mode persistence. Remote mode writes through the repository on each command.
  useEffect(() => {
    if (repository.isRemote) return;
    writeLocal('user', currentUser);
  }, [currentUser]);

  useEffect(() => {
    if (repository.isRemote) return;
    writeLocal('applications', applications);
  }, [applications]);

  useEffect(() => {
    if (repository.isRemote) return;
    writeLocal('institutes', institutes);
  }, [institutes]);

  useEffect(() => {
    if (repository.isRemote) return;
    writeLocal('evcVisits', evcVisits);
  }, [evcVisits]);

  useEffect(() => {
    if (repository.isRemote) return;
    writeLocal('complianceRecords', complianceRecords);
  }, [complianceRecords]);

  useEffect(() => {
    if (repository.isRemote) return;
    writeLocal('documents', documents);
  }, [documents]);

  useEffect(() => {
    if (repository.isRemote) return;
    writeLocal('notifications', notifications);
  }, [notifications]);

  useEffect(() => {
    if (repository.isRemote) return;
    writeLocal('undertakings', undertakings);
  }, [undertakings]);

  useEffect(() => {
    if (repository.isRemote) return;
    writeLocal('alerts', alerts);
  }, [alerts]);

  useEffect(() => {
    if (repository.isRemote) return;
    writeLocal('escalations', escalations);
  }, [escalations]);

  // Legacy seed visits predate the application link; repair the association once.
  useEffect(() => {
    const linked = linkLegacyVisits(applications, evcVisits);
    if (!linked.changed) return;
    setApplications(linked.applications);
    setEvcVisits(linked.visits);
  }, [applications, evcVisits]);

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

  // A rejected remote write means the local view may have drifted; reload the snapshot.
  useEffect(() => {
    if (!repository.onWriteError) return;
    return repository.onWriteError((message) => {
      showToast(message, 'error');
      setRemoteRevision((value) => value + 1);
    });
  }, []);

  const randomizeCurrentUser = () => {
    const newName = getRandomFullName();
    const initials = getInitials(newName);
    const slug = newName.toLowerCase().replace(/\s+/g, '.');
    const newUser: UserProfile = {
      name: newName,
      role: 'Regional Officer',
      email: `${slug}@aicte-india.org`,
      initials
    };
    setCurrentUser(newUser);
    showToast(`Officer switched to random name: ${newName} (${initials})`, 'info');
  };

  const randomizeAllNames = () => {
    if (repository.isRemote) {
      showToast('Name randomisation is only available in demo mode.', 'warning');
      return;
    }
    // 1. Randomize current user
    const newName = getRandomFullName();
    const initials = getInitials(newName);
    const slug = newName.toLowerCase().replace(/\s+/g, '.');
    setCurrentUser({
      name: newName,
      role: 'Regional Officer',
      email: `${slug}@aicte-india.org`,
      initials
    });

    // 2. Randomize institute principals
    setInstitutes((prev) =>
      prev.map((inst) => ({
        ...inst,
        principalName: getRandomAcademicName()
      }))
    );

    // 3. Randomize EVC committees
    setEvcVisits((prev) =>
      prev.map((v) => {
        const mem1 = getRandomAcademicName();
        const mem2 = getRandomAcademicName();
        return {
          ...v,
          assignedCommittee: `Committee (${mem1.split(' ')[1]}, ${mem2.split(' ')[1]})`,
          committeeMembers: [mem1, mem2]
        };
      })
    );

    // 4. Randomize application timeline officers
    setApplications((prev) =>
      prev.map((app) => ({
        ...app,
        timeline: app.timeline.map((t) => ({
          ...t,
          officer: t.officer && t.officer.includes('Dr.') ? getRandomAcademicName() : t.officer
        }))
      }))
    );

    showToast('Randomized all officer, principal, and committee names!', 'success');
  };

  const getActor = (): ActorRef => {
    const activeUser = authService.getCurrentUser();
    return {
      id: activeUser?.id ?? 'USR-AICTE-001',
      name: activeUser?.name ?? 'Amit Sharma',
      role: activeUser?.role ?? 'AICTE_ADMIN',
      region: activeUser?.region,
      instituteId: activeUser?.instituteId
    };
  };

  const recordAudit = (draft: AuditDraft) => {
    try {
      appendAudit(draft, getActor());
    } catch (error) {
      console.warn('Unable to persist audit entry:', error);
    }
  };

  const buildDomainEvent = (
    type: DomainEventType,
    entityType: DomainEvent['entityType'],
    entityId: string,
    payload: Record<string, unknown> = {}
  ): DomainEvent => {
    const actor = getActor();
    return {
      id: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      entityType,
      entityId,
      at: getNow().toISOString(),
      actorId: actor.id,
      actorName: actor.name,
      correlationId: `COR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      payload
    };
  };

  const dispatchNotifications = (events: DomainEvent[], app?: Application | null) => {
    const drafts = events.flatMap((event) => notificationsForEvent(event, app));
    if (drafts.length === 0) return;
    const known = new Set(
      notifications.map((item) => item.dedupeKey).filter((key): key is string => Boolean(key))
    );
    const fresh = drafts.filter((draft) => !draft.dedupeKey || !known.has(draft.dedupeKey));
    if (fresh.length === 0) return;
    const stamp = formatDisplayDate(getNow());
    const created: NotificationItem[] = fresh.map((draft) => ({
      ...draft,
      id: `NTF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      timestamp: stamp,
      read: false
    }));
    setNotifications((prev) => [...created, ...prev]);
    created.forEach((notification) => repository.upsertNotification(notification));
  };

  const buildWorkflowContext = (app: Application): WorkflowContext => {
    const evcVisit = evcVisits.find(
      (visit) => visit.id === app.evcVisitId || visit.applicationId === app.id
    );
    return {
      evcVisit: evcVisit
        ? {
            id: evcVisit.id,
            status: evcVisit.status,
            reportSubmitted: evcVisit.reportSubmitted,
            reportSubmittedAt: evcVisit.reportSubmittedAt
          }
        : undefined,
      undertakings: undertakings.filter((item) => item.applicationId === app.id),
      config: resolveWorkflowConfig(authService.getSystemConfig())
    };
  };

  const checkTransition = (
    appId: string,
    request: Omit<TransitionRequest, 'actor'>
  ): TransitionResult => {
    const app = applications.find((item) => item.id === appId) ?? null;
    return canTransition(
      app,
      { ...request, actor: getActor() },
      app ? buildWorkflowContext(app) : { undertakings: [], config: resolveWorkflowConfig(authService.getSystemConfig()) }
    );
  };

  const transitionApplication = (
    appId: string,
    request: Omit<TransitionRequest, 'actor'>
  ): TransitionResult => {
    const app = applications.find((item) => item.id === appId);
    if (!app) {
      showToast('Application not found.', 'error');
      return { ok: false, code: 'NOT_FOUND', message: 'Application not found.', events: [], audit: [] };
    }

    const result = applyTransition(
      app,
      { ...request, actor: getActor() },
      buildWorkflowContext(app)
    );

    if (!result.ok || !result.app) {
      if (result.code === 'VERSION_CONFLICT') {
        if (repository.isRemote) {
          setRemoteRevision((value) => value + 1);
        } else {
          setApplications(
            readLocal<Application[]>('applications', []).map((item) => normalizeApplication(item))
          );
        }
      }
      showToast(result.message || 'This action is not permitted.', 'error');
      return result;
    }

    const updated = result.app;
    setApplications((prev) => prev.map((item) => (item.id === appId ? updated : item)));
    setSelectedApplication((prev) => (prev?.id === appId ? updated : prev));
    repository.upsertApplication(updated);
    result.audit.forEach(recordAudit);
    dispatchNotifications(result.events, updated);

    if (
      request.action === 'FORWARD' &&
      canonicalStage(updated.stage) === 'Approval (Subject to Undertaking)' &&
      routeRequiresStage(updated, 'Approval (Subject to Undertaking)') &&
      !undertakings.some((item) => item.applicationId === updated.id)
    ) {
      const config = resolveWorkflowConfig(authService.getSystemConfig());
      const planned = planUndertakingsForApproval(updated, config, getNow());
      if (planned.length) {
        setUndertakings((prev) => [...planned, ...prev]);
        planned.forEach((item) => {
          repository.upsertUndertaking(item);
          const createdEvent = buildDomainEvent('undertaking.created', 'Undertaking', item.id, {
            detail: `${item.title} recorded for ${updated.id}; evidence due ${formatDisplayDate(item.dueDate)}.`,
            applicationId: updated.id,
            instituteId: updated.instituteId,
            region: updated.region
          });
          recordAudit({
            action: 'CREATE_UNDERTAKING',
            entityType: 'Undertaking',
            entityId: item.id,
            details: `Time-bound undertaking "${item.title}" recorded on entry to conditional approval for ${updated.id}.`,
            previousState: JSON.stringify({ status: null }),
            newState: JSON.stringify({
              status: item.status,
              conditionCode: item.conditionCode,
              dueDate: item.dueDate
            }),
            eventType: createdEvent.type,
            correlationId: createdEvent.correlationId,
            source: 'ui'
          });
          dispatchNotifications([createdEvent], updated);
        });
        showToast(`${planned.length} time-bound undertaking(s) recorded for ${updated.id}.`, 'info');
      }
    }

    const messages: Record<string, string> = {
      FORWARD: `Application ${appId} moved to ${updated.stage}.`,
      RETURN: `Application ${appId} returned for institution correction.`,
      RESUBMIT: `Application ${appId} resubmitted and returned to the scrutiny queue.`,
      REVERT: `Application ${appId} reverted to ${updated.stage}.`,
      APPROVE: `Application ${appId} granted final approval.`,
      REJECT: `Application ${appId} rejected with recorded reasons.`
    };
    showToast(messages[request.action] ?? 'Application updated.', request.action === 'RETURN' ? 'warning' : 'success');
    return result;
  };

  const updateApplicationStage = (
    appId: string,
    newStage: ApplicationStage,
    _newStatus: ApplicationStatus = 'In Progress',
    note?: string
  ) => {
    transitionApplication(appId, { action: 'FORWARD', toStage: newStage, note });
  };

  const advanceApplication = (appId: string) => {
    const app = applications.find((item) => item.id === appId);
    transitionApplication(appId, { action: 'FORWARD', expectedVersion: app?.version });
  };

  const returnApplication = (appId: string, reason: string, reasonCode = 'OTHER') => {
    transitionApplication(appId, { action: 'RETURN', reasonCode, note: reason });
  };

  const approveApplication = (appId: string) => {
    const actor = getActor();
    transitionApplication(appId, {
      action: 'APPROVE',
      reasonCode: 'APPROVED_FINAL',
      note: 'Final approval granted by the AICTE Competent Authority.',
      competentAuthority: actor.name
    });
  };

  const rejectApplication = (appId: string, reason: string, reasonCode = 'OTHER') => {
    transitionApplication(appId, { action: 'REJECT', reasonCode, note: reason });
  };

  const addNewApplication = (appData: Partial<Application>) => {
    const authCheck = authService.authorizeAction('applications.create', {
      instituteId: appData.instituteId
    });
    if (!authCheck.authorized) {
      showToast(authCheck.reason || 'Unauthorized to submit application.', 'error');
      return;
    }

    const institute = institutes.find((item) => item.id === appData.instituteId);
    const type = appData.type || 'Extension of Approval (EoA)';
    const route = resolveRoute(type);
    const config = resolveWorkflowConfig(authService.getSystemConfig());
    const now = getNow();
    const iso = toIsoDate(now);
    const displayNow = formatDisplayDate(now);
    const stage: ApplicationStage = 'Submitted';
    const stageDueAt = computeDueDate(iso, config.stageSlas[stage].days, config.businessDaysOnly);
    const newId = appData.id || `AICTE/${now.getFullYear()}/${Math.floor(12877 + Math.random() * 900)}`;

    const timeline = route.stages.map((routeStage, index) => ({
      stage: routeStage,
      date: index === 0 ? displayNow : 'Pending',
      status: index === 0 ? ('current' as const) : ('pending' as const),
      enteredAt: index === 0 ? iso : undefined,
      dueAt: index === 0 ? stageDueAt : undefined,
      notes: index === 0 ? 'Application filed through the institutional portal.' : undefined
    }));

    const newApp: Application = normalizeApplication({
      id: newId,
      instituteId: appData.instituteId || institute?.id || 'INST-101',
      instituteName: appData.instituteName || institute?.name || 'New Institution',
      type,
      routeId: route.id,
      region: appData.region || institute?.region || 'Northern',
      state: appData.state || institute?.state || 'Delhi',
      stage,
      status: 'In Progress',
      lastUpdated: displayNow,
      appliedDate: appData.appliedDate || displayNow,
      stageEnteredAt: iso,
      stageDueAt,
      category: appData.category || institute?.category || 'Engineering & Technology',
      intakeProposed: appData.intakeProposed ?? 300,
      programs: appData.programs ?? ['Computer Engineering'],
      contactEmail: appData.contactEmail || institute?.email || 'contact@inst.edu',
      contactPhone: appData.contactPhone || institute?.phone || '+91 90000 00000',
      remarks: appData.remarks || `Application submitted and routed via ${route.label}.`,
      documents: appData.documents ?? [
        { name: 'Application Form', type: 'PDF', status: 'Pending', uploadedOn: displayNow }
      ],
      timeline,
      version: 1
    });

    setApplications((prev) => [newApp, ...prev]);
    repository.upsertApplication(newApp);
    const submittedEvent = buildDomainEvent('application.submitted', 'Application', newId, {
      route: route.id,
      toStage: stage
    });
    recordAudit({
      action: 'SUBMIT_APPLICATION',
      entityType: 'Application',
      entityId: newId,
      details: `Application ${newId} submitted for ${newApp.instituteName} and routed via ${route.label}.`,
      previousState: JSON.stringify({ stage: null, route: null }),
      newState: JSON.stringify({ stage, route: route.id, dueAt: stageDueAt }),
      eventType: submittedEvent.type,
      correlationId: submittedEvent.correlationId,
      source: 'ui'
    });
    dispatchNotifications([submittedEvent], newApp);
    showToast(`Application ${newId} registered and routed via ${route.label}.`, 'success');
  };

  const scheduleEVC = (visitData: Omit<EVCVisit, 'id'>): boolean => {
    const authCheck = authService.authorizeAction('evc.schedule', {
      region: visitData.region,
      instituteId: visitData.instituteId
    });
    if (!authCheck.authorized) {
      showToast(authCheck.reason || 'Unauthorized to schedule EVC inspection visit.', 'error');
      return false;
    }

    if (!visitData.applicationId) {
      showToast('Select the application this inspection belongs to.', 'error');
      return false;
    }

    const application = applications.find((item) => item.id === visitData.applicationId);
    if (!application) {
      showToast('Linked application not found. Refresh and try again.', 'error');
      return false;
    }
    if (application.status === 'Approved' || application.status === 'Rejected') {
      showToast(`Application ${application.id} is already ${application.status.toLowerCase()}.`, 'error');
      return false;
    }
    if (!routeRequiresStage(application, 'Expert Visit Committee (EVC)')) {
      showToast(`The ${application.type} route does not require an Expert Visit Committee.`, 'error');
      return false;
    }
    if (activeVisitFor(application, evcVisits)) {
      showToast(`An active EVC visit already exists for ${application.id}.`, 'error');
      return false;
    }

    const config = resolveWorkflowConfig(authService.getSystemConfig());
    const id = `EVC-${Math.floor(8810 + Math.random() * 900)}`;
    const visitDate = parseDate(visitData.date) ? visitData.date : toIsoDate(getNow());
    const newVisit: EVCVisit = {
      ...visitData,
      id,
      date: visitDate,
      scheduledAt: visitDate,
      reportDueAt: computeDueDate(visitDate, config.evcReportSlaDays, config.businessDaysOnly)
    };

    let updatedApp = application;
    let transitionEvents: DomainEvent[] = [];
    let transitionAudits: AuditDraft[] = [];

    if (canonicalStage(application.stage) !== 'Expert Visit Committee (EVC)') {
      const transition = applyTransition(
        application,
        {
          action: 'FORWARD',
          toStage: 'Expert Visit Committee (EVC)',
          actor: getActor(),
          note: `EVC visit ${id} scheduled for ${visitDate}.`
        },
        {
          ...buildWorkflowContext(application),
          evcVisit: { id, status: 'Scheduled', reportSubmitted: false },
          config
        }
      );
      if (!transition.ok || !transition.app) {
        showToast(transition.message || 'This application cannot move to the EVC stage yet.', 'error');
        return false;
      }
      updatedApp = transition.app;
      transitionEvents = transition.events;
      transitionAudits = transition.audit;
    }

    updatedApp = { ...updatedApp, evcVisitId: id };
    setApplications((prev) => prev.map((item) => (item.id === updatedApp.id ? updatedApp : item)));
    setSelectedApplication((prev) => (prev?.id === updatedApp.id ? updatedApp : prev));
    repository.upsertApplication(updatedApp);

    setEvcVisits((prev) => [newVisit, ...prev]);
    repository.upsertEVCVisit(newVisit);

    transitionAudits.forEach(recordAudit);

    const scheduledEvent = buildDomainEvent('evc.scheduled', 'EVC', id, {
      applicationId: updatedApp.id,
      committee: newVisit.assignedCommittee,
      scheduledAt: newVisit.scheduledAt,
      reportDueAt: newVisit.reportDueAt
    });
    recordAudit({
      action: 'SCHEDULE_EVC',
      entityType: 'EVC',
      entityId: id,
      details: `EVC inspection ${id} scheduled for ${visitData.instituteName} on ${visitDate}.`,
      newState: JSON.stringify({
        applicationId: updatedApp.id,
        date: newVisit.date,
        committee: newVisit.assignedCommittee,
        reportDueAt: newVisit.reportDueAt
      }),
      eventType: scheduledEvent.type,
      correlationId: scheduledEvent.correlationId,
      source: 'ui'
    });

    dispatchNotifications([...transitionEvents, scheduledEvent], updatedApp);

    showToast(
      updatedApp.stage === 'Expert Visit Committee (EVC)'
        ? `EVC scheduled — ${updatedApp.id} moved to the Expert Visit Committee stage.`
        : `EVC Visit scheduled for ${visitData.instituteName}.`,
      'success'
    );
    return true;
  };

  const persistVisit = (visit: EVCVisit) => {
    setEvcVisits((prev) => prev.map((item) => (item.id === visit.id ? visit : item)));
    repository.upsertEVCVisit(visit);
  };

  const cancelEVC = (id: string) => {
    const visit = evcVisits.find((item) => item.id === id);
    if (!visit) return;
    if (visit.reportSubmitted || visit.status === 'Completed') {
      showToast('A completed inspection cannot be cancelled.', 'error');
      return;
    }
    const authCheck = authService.authorizeAction('evc.schedule', { region: visit.region });
    if (!authCheck.authorized) {
      showToast(authCheck.reason || 'Unauthorized to cancel this inspection.', 'error');
      return;
    }
    persistVisit({ ...visit, status: 'Cancelled' });
    const cancelledEvent = buildDomainEvent('evc.cancelled', 'EVC', id, {
      applicationId: visit.applicationId
    });
    recordAudit({
      action: 'CANCEL_EVC',
      entityType: 'EVC',
      entityId: id,
      details: `EVC inspection ${id} cancelled for ${visit.instituteName}`,
      previousState: JSON.stringify({ status: visit.status, date: visit.date }),
      newState: JSON.stringify({ status: 'Cancelled' }),
      eventType: cancelledEvent.type,
      correlationId: cancelledEvent.correlationId,
      source: 'ui'
    });
    dispatchNotifications(
      [cancelledEvent],
      applications.find((app) => app.id === visit.applicationId) ?? null
    );
    showToast(`EVC Visit ${id} has been cancelled`, 'info');
  };

  const rescheduleEVC = (id: string, newDate: string) => {
    const visit = evcVisits.find((item) => item.id === id);
    if (!visit) return;
    if (visit.reportSubmitted || visit.status === 'Completed') {
      showToast('A completed inspection cannot be rescheduled.', 'error');
      return;
    }
    if (!parseDate(newDate)) {
      showToast('Choose a valid inspection date.', 'error');
      return;
    }
    const authCheck = authService.authorizeAction('evc.schedule', { region: visit.region });
    if (!authCheck.authorized) {
      showToast(authCheck.reason || 'Unauthorized to reschedule this inspection.', 'error');
      return;
    }
    const dateObj = parseDate(newDate) ?? getNow();
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = dateObj.toLocaleString('en-US', { month: 'short' });
    const config = resolveWorkflowConfig(authService.getSystemConfig());

    persistVisit({
      ...visit,
      date: newDate,
      displayDate: { day, month },
      status: 'Scheduled',
      scheduledAt: newDate,
      reportDueAt: computeDueDate(newDate, config.evcReportSlaDays, config.businessDaysOnly)
    });
    const rescheduledEvent = buildDomainEvent('evc.rescheduled', 'EVC', id, {
      applicationId: visit.applicationId,
      committee: visit.assignedCommittee,
      scheduledAt: newDate
    });
    recordAudit({
      action: 'RESCHEDULE_EVC',
      entityType: 'EVC',
      entityId: id,
      details: `EVC inspection ${id} rescheduled to ${newDate}`,
      previousState: JSON.stringify({ date: visit.date }),
      newState: JSON.stringify({ date: newDate }),
      eventType: rescheduledEvent.type,
      correlationId: rescheduledEvent.correlationId,
      source: 'ui'
    });
    dispatchNotifications(
      [rescheduledEvent],
      applications.find((app) => app.id === visit.applicationId) ?? null
    );
    showToast(`EVC Visit ${id} rescheduled to ${day} ${month}`, 'success');
  };

  const completeEVC: AppContextType['completeEVC'] = (visitId, input) => {
    const authCheck = authService.authorizeAction('evc.report.submit');
    if (!authCheck.authorized) {
      showToast(authCheck.reason || 'Unauthorized to submit an inspection report.', 'error');
      return false;
    }

    const visit = evcVisits.find((item) => item.id === visitId);
    if (!visit) {
      showToast('Inspection visit not found.', 'error');
      return false;
    }
    if (visit.reportSubmitted || visit.status === 'Completed') {
      showToast('The inspection report for this visit is already on record.', 'error');
      return false;
    }

    const progress = checklistProgress(visit);
    if (!progress.complete) {
      showToast(
        `Complete the inspection checklist before submitting (${progress.assessed}/${progress.total} items assessed).`,
        'error'
      );
      return false;
    }

    const actor = getActor();
    const now = getNow();
    const isoNow = toIsoDate(now);
    const report: InspectionReport = {
      id: `IR-${Date.now().toString(36).toUpperCase()}`,
      visitId: visit.id,
      applicationId: visit.applicationId,
      instituteId: visit.instituteId,
      instituteName: visit.instituteName,
      inspectorId: actor.id,
      inspectorName: actor.name,
      visitDate: visit.date,
      submissionDate: formatDisplayDate(now),
      infrastructureScore: input.infrastructureScore,
      facultyScore: input.facultyScore,
      labScore: input.labScore,
      safetyCompliance: input.safetyCompliance,
      recommendations: input.recommendations,
      remarks: input.remarks.trim(),
      evidenceFiles: visit.evidenceFiles ?? [],
      status: 'Submitted'
    };

    const updatedVisit: EVCVisit = {
      ...visit,
      status: 'Completed',
      reportSubmitted: true,
      reportSubmittedAt: isoNow,
      report
    };
    setEvcVisits((prev) => prev.map((item) => (item.id === visitId ? updatedVisit : item)));
    repository.upsertEVCVisit(updatedVisit);

    const completedEvent = buildDomainEvent('evc.completed', 'EVC', visitId, {
      applicationId: visit.applicationId,
      recommendation: input.recommendations,
      reportId: report.id,
      reportSubmittedAt: isoNow
    });
    recordAudit({
      action: 'COMPLETE_EVC',
      entityType: 'EVC',
      entityId: visitId,
      details: `Inspection report ${report.id} submitted by ${actor.name} (${input.recommendations}).`,
      previousState: JSON.stringify({ status: visit.status, reportSubmitted: false }),
      newState: JSON.stringify({
        status: 'Completed',
        reportId: report.id,
        recommendation: input.recommendations,
        evidenceFiles: report.evidenceFiles.length
      }),
      eventType: completedEvent.type,
      correlationId: completedEvent.correlationId,
      source: 'ui'
    });

    const application = applications.find((item) => item.id === visit.applicationId) ?? null;
    let updatedApplication: Application | null = null;
    let advanceEvents: DomainEvent[] = [];

    // Automation never decides: a "Not Recommended" finding stays at EVC for the
    // competent authority to act on rather than auto-forwarding the case.
    if (
      application &&
      canonicalStage(application.stage) === 'Expert Visit Committee (EVC)' &&
      input.recommendations !== 'Not Recommended'
    ) {
      const transition = applyTransition(
        application,
        {
          action: 'FORWARD',
          actor,
          note: `EVC report ${report.id} submitted (${input.recommendations}).`
        },
        {
          ...buildWorkflowContext(application),
          evcVisit: {
            id: visit.id,
            status: 'Completed',
            reportSubmitted: true,
            reportSubmittedAt: isoNow
          }
        }
      );
      if (transition.ok && transition.app) {
        updatedApplication = transition.app;
        advanceEvents = transition.events;
        setApplications((prev) =>
          prev.map((item) => (item.id === transition.app!.id ? transition.app! : item))
        );
        setSelectedApplication((prev) => (prev?.id === transition.app!.id ? transition.app! : prev));
        repository.upsertApplication(transition.app);
        transition.audit.forEach(recordAudit);
      } else if (transition.message) {
        showToast(`Report saved, but the case did not advance: ${transition.message}`, 'warning');
      }
    }

    dispatchNotifications([completedEvent, ...advanceEvents], updatedApplication ?? application);

    showToast(
      input.recommendations === 'Not Recommended'
        ? `Report ${report.id} recorded. The case remains with the competent authority.`
        : `Report ${report.id} submitted for ${visit.instituteName}.`,
      'success'
    );
    return true;
  };

  const saveVisitChecklist = (visitId: string, marks: EVCVisitChecklistItem[]) => {
    const visit = evcVisits.find((item) => item.id === visitId);
    if (!visit || visit.reportSubmitted) return;
    const authCheck = authService.authorizeAction('evc.report.submit');
    if (!authCheck.authorized) {
      showToast(authCheck.reason || 'Unauthorized to record checklist findings.', 'error');
      return;
    }
    const updated: EVCVisit = { ...visit, checklist: marks };
    setEvcVisits((prev) => prev.map((item) => (item.id === visitId ? updated : item)));
    repository.upsertEVCVisit(updated);
    const progress = checklistProgress(updated);
    recordAudit({
      action: 'SAVE_EVC_CHECKLIST',
      entityType: 'EVC',
      entityId: visitId,
      details: `Checklist saved for ${visit.instituteName}: ${progress.assessed}/${progress.total} assessed, ${progress.failed} deficient.`,
      previousState: JSON.stringify({ assessed: checklistProgress(visit).assessed }),
      newState: JSON.stringify({ assessed: progress.assessed, failed: progress.failed }),
      source: 'ui'
    });
    showToast(`Checklist saved (${progress.assessed}/${progress.total}).`, 'success');
  };

  const addVisitEvidence = (visitId: string, title: string) => {
    const visit = evcVisits.find((item) => item.id === visitId);
    if (!visit || visit.reportSubmitted) return;
    const authCheck = authService.authorizeAction('evc.report.submit');
    if (!authCheck.authorized) {
      showToast(authCheck.reason || 'Unauthorized to attach inspection evidence.', 'error');
      return;
    }
    const evidenceFiles = [...(visit.evidenceFiles ?? []), title];
    const updated: EVCVisit = { ...visit, evidenceFiles };
    setEvcVisits((prev) => prev.map((item) => (item.id === visitId ? updated : item)));
    repository.upsertEVCVisit(updated);
    recordAudit({
      action: 'ATTACH_EVC_EVIDENCE',
      entityType: 'EVC',
      entityId: visitId,
      details: `Evidence "${title}" attached to inspection ${visitId}.`,
      newState: JSON.stringify({ evidenceFiles: evidenceFiles.length }),
      source: 'ui'
    });
  };

  const removeVisitEvidence = (visitId: string, title: string) => {
    const visit = evcVisits.find((item) => item.id === visitId);
    if (!visit || visit.reportSubmitted) return;
    const evidenceFiles = (visit.evidenceFiles ?? []).filter((item) => item !== title);
    const updated: EVCVisit = { ...visit, evidenceFiles };
    setEvcVisits((prev) => prev.map((item) => (item.id === visitId ? updated : item)));
    repository.upsertEVCVisit(updated);
    recordAudit({
      action: 'REMOVE_EVC_EVIDENCE',
      entityType: 'EVC',
      entityId: visitId,
      details: `Evidence "${title}" removed from inspection ${visitId}.`,
      newState: JSON.stringify({ evidenceFiles: evidenceFiles.length }),
      source: 'ui'
    });
  };

  const uploadCompliance = (recordData: Omit<ComplianceRecord, 'id'>) => {
    const authCheck = authService.authorizeAction('compliance.submit', {
      region: recordData.region,
      instituteId: recordData.instituteId
    });
    if (!authCheck.authorized) {
      showToast(authCheck.reason || 'Unauthorized to upload a compliance dossier.', 'error');
      return;
    }

    const id = `CMP-${Math.floor(200 + Math.random() * 800)}`;
    const newRecord: ComplianceRecord = {
      ...recordData,
      id,
      submissionDate: recordData.submissionDate || formatDisplayDate(getNow())
    };
    setComplianceRecords((prev) => [newRecord, ...prev]);
    repository.upsertComplianceRecord(newRecord);
    const submittedEvent = buildDomainEvent('compliance.submitted', 'Undertaking', id, {
      detail: `${newRecord.title} submitted by ${recordData.instituteName}.`
    });
    recordAudit({
      action: 'SUBMIT_COMPLIANCE',
      entityType: 'Compliance',
      entityId: id,
      details: `Compliance submission uploaded for ${recordData.instituteName}`,
      newState: JSON.stringify({ title: newRecord.title, status: newRecord.status }),
      eventType: submittedEvent.type,
      correlationId: submittedEvent.correlationId,
      source: 'ui'
    });
    dispatchNotifications(
      [submittedEvent],
      applications.find((app) => app.instituteId === recordData.instituteId) ?? null
    );
    showToast(`Compliance submission uploaded for ${recordData.instituteName}`, 'success');
  };

  const verifyCompliance = (id: string) => {
    const record = complianceRecords.find((item) => item.id === id);
    if (!record) return;
    const authCheck = authService.authorizeAction('compliance.verify', {
      region: record.region,
      instituteId: record.instituteId
    });
    if (!authCheck.authorized) {
      showToast(authCheck.reason || 'Unauthorized to verify this compliance record.', 'error');
      return;
    }
    const actor = getActor();
    const updated: ComplianceRecord = {
      ...record,
      status: 'Verified',
      urgency: 'low',
      verifiedAt: toIsoDate(getNow()),
      verifiedBy: actor.name
    };
    setComplianceRecords((prev) => prev.map((item) => (item.id === id ? updated : item)));
    repository.upsertComplianceRecord(updated);
    const verifiedEvent = buildDomainEvent('compliance.verified', 'Undertaking', id, {
      detail: `${record.title} verified by ${actor.name}.`
    });
    recordAudit({
      action: 'VERIFY_COMPLIANCE',
      entityType: 'Compliance',
      entityId: id,
      details: `Compliance record ${id} verified by ${actor.name}`,
      previousState: JSON.stringify({ status: record.status }),
      newState: JSON.stringify({ status: 'Verified', verifiedBy: actor.name }),
      eventType: verifiedEvent.type,
      correlationId: verifiedEvent.correlationId,
      source: 'ui'
    });
    dispatchNotifications(
      [verifiedEvent],
      applications.find((app) => app.instituteId === record.instituteId) ?? null
    );
    showToast(`Compliance record ${id} marked as Verified!`, 'success');
  };

  const createUndertaking: AppContextType['createUndertaking'] = (input) => {
    const app = applications.find((item) => item.id === input.applicationId);
    if (!app) {
      showToast('Application not found for this undertaking.', 'error');
      return false;
    }

    const authCheck = authService.authorizeAction('compliance.verify', {
      region: app.region,
      instituteId: app.instituteId
    });
    if (!authCheck.authorized) {
      showToast(authCheck.reason || 'Unauthorized to record an undertaking.', 'error');
      return false;
    }

    if (!routeRequiresStage(app, 'Approval (Subject to Undertaking)')) {
      showToast(`The ${app.type} route does not carry time-bound undertakings.`, 'error');
      return false;
    }
    if (app.status === 'Approved' || app.status === 'Rejected') {
      showToast('A decided application cannot receive a new undertaking.', 'error');
      return false;
    }
    if (input.dueDate && !parseDate(input.dueDate)) {
      showToast('Enter a valid evidence due date.', 'error');
      return false;
    }

    const duplicate = undertakings.find(
      (item) =>
        item.applicationId === app.id &&
        item.conditionCode === input.conditionCode &&
        item.status !== 'Verified' &&
        item.status !== 'Rejected'
    );
    if (duplicate) {
      showToast('That condition is already open for this application.', 'error');
      return false;
    }

    const config = resolveWorkflowConfig(authService.getSystemConfig());
    const created = buildUndertaking(app, input.conditionCode, config, getNow(), input.dueDate);
    setUndertakings((prev) => [created, ...prev]);
    repository.upsertUndertaking(created);

    const condition = getUndertakingCondition(created.conditionCode);
    const createdEvent = buildDomainEvent('undertaking.created', 'Undertaking', created.id, {
      detail: `${created.title} recorded for ${app.id}; evidence due ${formatDisplayDate(created.dueDate)}.`,
      applicationId: app.id,
      instituteId: app.instituteId,
      region: app.region
    });
    recordAudit({
      action: 'CREATE_UNDERTAKING',
      entityType: 'Undertaking',
      entityId: created.id,
      details: `Time-bound undertaking "${created.title}" recorded for ${app.id}${input.note ? `: ${input.note}` : '.'}`,
      previousState: JSON.stringify({ status: null }),
      newState: JSON.stringify({
        status: created.status,
        conditionCode: created.conditionCode,
        dueDate: created.dueDate
      }),
      eventType: createdEvent.type,
      correlationId: createdEvent.correlationId,
      source: 'ui'
    });
    dispatchNotifications([createdEvent], app);
    showToast(`${condition?.title ?? created.title} recorded; evidence due ${formatDisplayDate(created.dueDate)}.`, 'success');
    return true;
  };

  const submitUndertakingEvidence: AppContextType['submitUndertakingEvidence'] = (id, evidenceTitle) => {
    const item = undertakings.find((entry) => entry.id === id);
    if (!item) {
      showToast('Undertaking not found.', 'error');
      return false;
    }
    const app = applications.find((entry) => entry.id === item.applicationId) ?? null;
    const authCheck = authService.authorizeAction('compliance.submit', {
      region: item.region,
      instituteId: item.instituteId
    });
    if (!authCheck.authorized) {
      showToast(authCheck.reason || 'Unauthorized to submit undertaking evidence.', 'error');
      return false;
    }
    if (!evidenceTitle.trim()) {
      showToast('Attach or name the evidence file before submitting.', 'error');
      return false;
    }
    if (item.status === 'Verified') {
      showToast('This undertaking is already verified.', 'error');
      return false;
    }
    if (item.status === 'Submitted') {
      showToast('Evidence is already awaiting officer verification.', 'error');
      return false;
    }

    const actor = getActor();
    const updated: Undertaking = {
      ...item,
      evidenceDocumentIds: [...item.evidenceDocumentIds, evidenceTitle.trim()],
      submittedAt: toIsoDate(getNow()),
      submittedBy: actor.name,
      status: 'Submitted'
    };
    setUndertakings((prev) => prev.map((entry) => (entry.id === id ? updated : entry)));
    repository.upsertUndertaking(updated);

    const submittedEvent = buildDomainEvent('undertaking.submitted', 'Undertaking', id, {
      detail: `${item.title} evidence "${evidenceTitle.trim()}" submitted by ${actor.name} for ${item.applicationId}.`,
      applicationId: item.applicationId,
      instituteId: item.instituteId,
      region: item.region
    });
    recordAudit({
      action: 'SUBMIT_UNDERTAKING_EVIDENCE',
      entityType: 'Undertaking',
      entityId: id,
      details: `Evidence "${evidenceTitle.trim()}" submitted for undertaking ${id} by ${actor.name}.`,
      previousState: JSON.stringify({ status: item.status, evidenceCount: item.evidenceDocumentIds.length }),
      newState: JSON.stringify({ status: updated.status, evidenceCount: updated.evidenceDocumentIds.length }),
      eventType: submittedEvent.type,
      correlationId: submittedEvent.correlationId,
      source: 'ui'
    });
    dispatchNotifications([submittedEvent], app);
    showToast(`Evidence submitted for ${item.title}; awaiting officer verification.`, 'success');
    return true;
  };

  const verifyUndertaking: AppContextType['verifyUndertaking'] = (id) => {
    const item = undertakings.find((entry) => entry.id === id);
    if (!item) {
      showToast('Undertaking not found.', 'error');
      return false;
    }
    const authCheck = authService.authorizeAction('compliance.verify', {
      region: item.region,
      instituteId: item.instituteId
    });
    if (!authCheck.authorized) {
      showToast(authCheck.reason || 'Unauthorized to verify this undertaking.', 'error');
      return false;
    }
    if (item.status !== 'Submitted') {
      showToast('Evidence must be submitted before the undertaking can be verified.', 'error');
      return false;
    }

    const actor = getActor();
    const updated: Undertaking = {
      ...item,
      status: 'Verified',
      verifiedAt: toIsoDate(getNow()),
      verifiedBy: actor.name,
      escalationLevel: 0
    };
    setUndertakings((prev) => prev.map((entry) => (entry.id === id ? updated : entry)));
    repository.upsertUndertaking(updated);

    const verifiedEvent = buildDomainEvent('undertaking.verified', 'Undertaking', id, {
      detail: `${item.title} verified by ${actor.name} for ${item.applicationId}.`,
      applicationId: item.applicationId,
      instituteId: item.instituteId,
      region: item.region
    });
    recordAudit({
      action: 'VERIFY_UNDERTAKING',
      entityType: 'Undertaking',
      entityId: id,
      details: `Undertaking ${id} verified by ${actor.name}; the case is cleared for final approval.`,
      previousState: JSON.stringify({ status: item.status, escalationLevel: item.escalationLevel }),
      newState: JSON.stringify({ status: updated.status, verifiedBy: actor.name }),
      eventType: verifiedEvent.type,
      correlationId: verifiedEvent.correlationId,
      source: 'ui'
    });
    dispatchNotifications(
      [verifiedEvent],
      applications.find((entry) => entry.id === item.applicationId) ?? null
    );
    showToast(`${item.title} verified. Pending conditions updated.`, 'success');
    return true;
  };

  const rejectUndertaking: AppContextType['rejectUndertaking'] = (id, reason) => {
    const item = undertakings.find((entry) => entry.id === id);
    if (!item) {
      showToast('Undertaking not found.', 'error');
      return false;
    }
    const authCheck = authService.authorizeAction('compliance.verify', {
      region: item.region,
      instituteId: item.instituteId
    });
    if (!authCheck.authorized) {
      showToast(authCheck.reason || 'Unauthorized to reject this undertaking.', 'error');
      return false;
    }
    if (!reason.trim()) {
      showToast('Record the reason for rejecting the evidence.', 'error');
      return false;
    }
    if (item.status !== 'Submitted') {
      showToast('Only submitted evidence can be rejected.', 'error');
      return false;
    }

    const actor = getActor();
    const updated: Undertaking = {
      ...item,
      status: 'Rejected',
      rejectionReason: reason.trim()
    };
    setUndertakings((prev) => prev.map((entry) => (entry.id === id ? updated : entry)));
    repository.upsertUndertaking(updated);

    const rejectedEvent = buildDomainEvent('undertaking.rejected', 'Undertaking', id, {
      detail: `${item.title} evidence rejected by ${actor.name}: ${reason.trim()}`,
      applicationId: item.applicationId,
      instituteId: item.instituteId,
      region: item.region
    });
    recordAudit({
      action: 'REJECT_UNDERTAKING',
      entityType: 'Undertaking',
      entityId: id,
      details: `Undertaking ${id} evidence rejected by ${actor.name}: ${reason.trim()}`,
      previousState: JSON.stringify({ status: item.status }),
      newState: JSON.stringify({ status: updated.status, rejectionReason: updated.rejectionReason }),
      eventType: rejectedEvent.type,
      correlationId: rejectedEvent.correlationId,
      source: 'ui'
    });
    dispatchNotifications(
      [rejectedEvent],
      applications.find((entry) => entry.id === item.applicationId) ?? null
    );
    showToast(`${item.title} evidence rejected; the institution has been notified.`, 'warning');
    return true;
  };

  const nextDocumentId = () =>
    `DOC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

  const uploadDocument: AppContextType['uploadDocument'] = (docData) => {
    const authCheck = authService.authorizeAction('documents.upload', {
      region: docData.region,
      instituteId: docData.instituteId
    });
    if (!authCheck.authorized) {
      showToast(authCheck.reason || 'Unauthorized to upload this document.', 'error');
      return false;
    }
    if (!docData.title.trim()) {
      showToast('Enter a document title before uploading.', 'error');
      return false;
    }
    if (!parseDate(docData.expiryDate)) {
      showToast('Enter a valid expiry date.', 'error');
      return false;
    }
    const issued = parseDate(docData.uploadDate);
    const expiry = parseDate(docData.expiryDate);
    if (issued && expiry && expiry < issued) {
      showToast('Expiry date cannot fall before the issue date.', 'error');
      return false;
    }

    const id = nextDocumentId();
    const newDoc: DocumentItem = {
      ...docData,
      id,
      title: docData.title.trim(),
      uploadDate: issued ? toIsoDate(issued) : toIsoDate(getNow()),
      expiryDate: toIsoDate(docData.expiryDate),
      status: docData.status ?? 'Pending',
      renewalStatus: docData.renewalOfId ? 'Submitted' : docData.renewalStatus
    };
    setDocuments((prev) => [newDoc, ...prev]);
    repository.upsertDocument(newDoc);

    const uploadedEvent = buildDomainEvent('document.uploaded', 'Document', id, {
      detail: `${newDoc.title} uploaded by ${newDoc.instituteName} for verification.`,
      instituteId: newDoc.instituteId,
      region: newDoc.region
    });
    recordAudit({
      action: 'UPLOAD_DOCUMENT',
      entityType: 'Document',
      entityId: id,
      details: `Document "${newDoc.title}" uploaded for ${newDoc.instituteName}`,
      previousState: JSON.stringify({ status: null }),
      newState: JSON.stringify({
        status: newDoc.status,
        expiryDate: newDoc.expiryDate,
        documentTypeCode: newDoc.documentTypeCode
      }),
      eventType: uploadedEvent.type,
      correlationId: uploadedEvent.correlationId,
      source: 'ui'
    });
    dispatchNotifications(
      [uploadedEvent],
      applications.find((app) => app.instituteId === newDoc.instituteId) ?? null
    );
    showToast(`Document "${newDoc.title}" uploaded successfully.`, 'success');
    return true;
  };

  const requestDocumentRenewal: AppContextType['requestDocumentRenewal'] = (id) => {
    const item = documents.find((document) => document.id === id);
    if (!item) {
      showToast('Document not found.', 'error');
      return false;
    }

    const authCheck = authService.authorizeAction('documents.upload', {
      region: item.region,
      instituteId: item.instituteId
    });
    if (!authCheck.authorized) {
      showToast(authCheck.reason || 'Unauthorized to request a renewal.', 'error');
      return false;
    }
    if (item.renewalStatus) {
      showToast(`A renewal is already ${item.renewalStatus.toLowerCase()} for this document.`, 'error');
      return false;
    }
    const config = resolveWorkflowConfig(authService.getSystemConfig());
    if (!canRequestRenewal(item, config.documentWarningDays)) {
      showToast('This document is still within its validity window.', 'error');
      return false;
    }

    const actor = getActor();
    const updated = markRenewalRequested(item);
    setDocuments((prev) => prev.map((document) => (document.id === id ? updated : document)));
    repository.upsertDocument(updated);

    const requestedEvent = buildDomainEvent('document.renewal_requested', 'Document', id, {
      detail: `${item.title} renewal requested by ${actor.name} for ${item.instituteName}.`,
      instituteId: item.instituteId,
      region: item.region
    });
    recordAudit({
      action: 'REQUEST_DOCUMENT_RENEWAL',
      entityType: 'Document',
      entityId: id,
      details: `Renewal requested for ${item.title} (${item.instituteName}).`,
      previousState: JSON.stringify({ renewalStatus: null, expiryDate: item.expiryDate }),
      newState: JSON.stringify({ renewalStatus: updated.renewalStatus }),
      eventType: requestedEvent.type,
      correlationId: requestedEvent.correlationId,
      source: 'ui'
    });
    dispatchNotifications(
      [requestedEvent],
      applications.find((app) => app.instituteId === item.instituteId) ?? null
    );
    showToast('Renewal requested. Submit the renewed validity evidence next.', 'info');
    return true;
  };

  const submitDocumentRenewal: AppContextType['submitDocumentRenewal'] = (id, input) => {
    const item = documents.find((document) => document.id === id);
    if (!item) {
      showToast('Document not found.', 'error');
      return false;
    }

    const authCheck = authService.authorizeAction('documents.upload', {
      region: item.region,
      instituteId: item.instituteId
    });
    if (!authCheck.authorized) {
      showToast(authCheck.reason || 'Unauthorized to submit renewal evidence.', 'error');
      return false;
    }
    if (!canSubmitRenewal(item)) {
      showToast('Request the renewal before submitting new validity evidence.', 'error');
      return false;
    }

    const expiry = parseDate(input.expiryDate);
    if (!expiry) {
      showToast('Enter a valid renewal expiry date.', 'error');
      return false;
    }
    if (daysUntil(input.expiryDate, getNow()) < 0) {
      showToast('The renewed expiry date cannot be in the past.', 'error');
      return false;
    }
    const currentExpiry = parseDate(item.expiryDate);
    if (currentExpiry && expiry <= currentExpiry) {
      showToast('The renewed expiry must extend beyond the current validity date.', 'error');
      return false;
    }

    const actor = getActor();
    const renewal = buildRenewalRecord(
      item,
      { ...input, id: nextDocumentId(), expiryDate: toIsoDate(expiry) },
      getNow()
    );
    const updatedOriginal = markRenewalSubmitted(item);
    setDocuments((prev) => [
      renewal,
      ...prev.map((document) => (document.id === id ? updatedOriginal : document))
    ]);
    repository.upsertDocument(updatedOriginal);
    repository.upsertDocument(renewal);

    const submittedEvent = buildDomainEvent('document.renewal_submitted', 'Document', renewal.id, {
      detail: `${renewal.title} submitted by ${actor.name}; new validity runs to ${formatDisplayDate(renewal.expiryDate)}.`,
      instituteId: item.instituteId,
      region: item.region,
      renewalOfId: item.id
    });
    recordAudit({
      action: 'SUBMIT_DOCUMENT_RENEWAL',
      entityType: 'Document',
      entityId: renewal.id,
      details: `Renewal evidence for ${item.title} submitted by ${actor.name}.`,
      previousState: JSON.stringify({ expiryDate: item.expiryDate, renewalStatus: item.renewalStatus }),
      newState: JSON.stringify({
        expiryDate: renewal.expiryDate,
        status: renewal.status,
        renewalOfId: item.id
      }),
      eventType: submittedEvent.type,
      correlationId: submittedEvent.correlationId,
      source: 'ui'
    });
    dispatchNotifications(
      [submittedEvent],
      applications.find((app) => app.instituteId === item.instituteId) ?? null
    );
    showToast('Renewal evidence submitted; awaiting officer verification.', 'success');
    return true;
  };

  const verifyDocument: AppContextType['verifyDocument'] = (id) => {
    const item = documents.find((document) => document.id === id);
    if (!item) {
      showToast('Document not found.', 'error');
      return false;
    }

    const authCheck = authService.authorizeAction('documents.verify', {
      region: item.region,
      instituteId: item.instituteId
    });
    if (!authCheck.authorized) {
      showToast(authCheck.reason || 'Unauthorized to verify this document.', 'error');
      return false;
    }
    if (item.status !== 'Pending') {
      showToast('Only documents pending verification can be verified.', 'error');
      return false;
    }

    const actor = getActor();
    const result = verifyDocumentInList(documents, id, actor.name);
    if (!result.verified) {
      showToast('Document not found.', 'error');
      return false;
    }
    setDocuments(result.documents);
    repository.upsertDocument(result.verified);
    if (result.predecessor) repository.upsertDocument(result.predecessor);

    const isRenewal = Boolean(result.predecessor);
    const verifiedEvent = buildDomainEvent(
      isRenewal ? 'document.renewal_verified' : 'document.verified',
      'Document',
      id,
      {
        detail: isRenewal
          ? `${result.verified.title} verified by ${actor.name}; ${result.predecessor?.title} superseded.`
          : `${result.verified.title} verified by ${actor.name} for ${result.verified.instituteName}.`,
        instituteId: result.verified.instituteId,
        region: result.verified.region,
        supersededId: result.predecessor?.id
      }
    );
    recordAudit({
      action: 'VERIFY_DOCUMENT',
      entityType: 'Document',
      entityId: id,
      details: isRenewal
        ? `Renewal verified by ${actor.name}; ${result.predecessor?.id} superseded by ${id}.`
        : `Document verified by ${actor.name}.`,
      previousState: JSON.stringify({ status: item.status }),
      newState: JSON.stringify({
        status: result.verified.status,
        verifiedBy: actor.name,
        supersededId: result.predecessor?.id
      }),
      eventType: verifiedEvent.type,
      correlationId: verifiedEvent.correlationId,
      source: 'ui'
    });
    dispatchNotifications(
      [verifiedEvent],
      applications.find((app) => app.instituteId === item.instituteId) ?? null
    );
    showToast(
      isRenewal
        ? 'Renewal verified; the previous document is superseded and its alert cleared.'
        : 'Document verified.',
      'success'
    );
    return true;
  };

  const rejectDocument: AppContextType['rejectDocument'] = (id, reason) => {
    const item = documents.find((document) => document.id === id);
    if (!item) {
      showToast('Document not found.', 'error');
      return false;
    }

    const authCheck = authService.authorizeAction('documents.verify', {
      region: item.region,
      instituteId: item.instituteId
    });
    if (!authCheck.authorized) {
      showToast(authCheck.reason || 'Unauthorized to reject this document.', 'error');
      return false;
    }
    if (item.status !== 'Pending') {
      showToast('Only documents pending verification can be rejected.', 'error');
      return false;
    }
    if (!reason.trim()) {
      showToast('Record a reason before rejecting the document.', 'error');
      return false;
    }

    const actor = getActor();
    const renewalResult = item.renewalOfId ? rejectRenewalInList(documents, id, reason.trim()) : null;
    const rejected: DocumentItem = renewalResult?.rejected ?? {
      ...item,
      status: 'Rejected',
      renewalNote: reason.trim()
    };
    const updatedDocuments =
      renewalResult?.documents ??
      documents.map((document) => (document.id === id ? rejected : document));

    setDocuments(updatedDocuments);
    repository.upsertDocument(rejected);
    if (renewalResult?.predecessor) repository.upsertDocument(renewalResult.predecessor);

    const rejectedEvent = buildDomainEvent(
      item.renewalOfId ? 'document.renewal_rejected' : 'document.rejected',
      'Document',
      id,
      {
        detail: `${item.title} rejected by ${actor.name}: ${reason.trim()}`,
        instituteId: item.instituteId,
        region: item.region
      }
    );
    recordAudit({
      action: 'REJECT_DOCUMENT',
      entityType: 'Document',
      entityId: id,
      details: `Document ${item.title} rejected by ${actor.name}: ${reason.trim()}`,
      previousState: JSON.stringify({ status: item.status }),
      newState: JSON.stringify({ status: rejected.status, renewalNote: reason.trim() }),
      eventType: rejectedEvent.type,
      correlationId: rejectedEvent.correlationId,
      source: 'ui'
    });
    dispatchNotifications(
      [rejectedEvent],
      applications.find((app) => app.instituteId === item.instituteId) ?? null
    );
    showToast('Document rejected; the institution has been notified.', 'warning');
    return true;
  };

  const markNotificationAsRead = (id: string) => {
    const notification = notifications.find((item) => item.id === id);
    if (!notification || notification.read) return;
    const updated = { ...notification, read: true };
    setNotifications((prev) => prev.map((item) => (item.id === id ? updated : item)));
    repository.upsertNotification(updated);
  };

  const markAllNotificationsAsRead = () => {
    const updated = notifications
      .filter((notification) => !notification.read)
      .map((notification) => ({ ...notification, read: true }));
    updated.forEach((notification) => repository.upsertNotification(notification));
    setNotifications((prev) =>
      prev.map((notification) => (notification.read ? notification : { ...notification, read: true }))
    );
    showToast('All notifications marked as read', 'info');
  };

  const sweepStateRef = useRef({ applications, evcVisits, undertakings, documents, alerts, escalations });
  useEffect(() => {
    sweepStateRef.current = { applications, evcVisits, undertakings, documents, alerts, escalations };
  }, [applications, evcVisits, undertakings, documents, alerts, escalations]);

  const findAppForEvent = (event: DomainEvent): Application | null => {
    const appId = typeof event.payload?.applicationId === 'string' ? event.payload.applicationId : undefined;
    if (appId) return applications.find((app) => app.id === appId) ?? null;
    return event.entityType === 'Application'
      ? applications.find((app) => app.id === event.entityId) ?? null
      : null;
  };

  const runSweep = () => {
    const state = sweepStateRef.current;
    const result = sweepDeadlines({
      ...state,
      config: resolveWorkflowConfig(authService.getSystemConfig()),
      now: getNow()
    });

    if (result.applications.some((app, index) => app !== state.applications[index])) {
      setApplications(result.applications);
    }
    if (result.createdAlerts.length || result.resolvedAlerts.length) setAlerts(result.alerts);
    if (result.createdEscalations.length || result.resolvedEscalations.length) {
      setEscalations(result.escalations);
    }

    result.createdAlerts.forEach((item) => {
      repository.upsertAlert(item);
      recordAudit({
        action: 'ALERT_RAISED',
        entityType: 'Alert',
        entityId: item.id,
        details: `Automated ${item.severity}-severity alert: ${item.title}`,
        newState: JSON.stringify({ tier: item.tier, status: item.status, rule: item.rule }),
        source: 'system'
      });
    });

    result.resolvedAlerts.forEach((item) => {
      repository.upsertAlert(item);
      recordAudit({
        action: 'ALERT_AUTO_RESOLVED',
        entityType: 'Alert',
        entityId: item.id,
        details: `Alert "${item.title}" closed because the underlying deadline condition cleared.`,
        newState: JSON.stringify({ status: item.status }),
        source: 'system'
      });
    });

    result.createdEscalations.forEach((item) => {
      repository.upsertEscalation(item);
      recordAudit({
        action: 'ESCALATION_RAISED',
        entityType: 'Escalation',
        entityId: item.id,
        details: `Automated ${item.urgency.toLowerCase()}-urgency escalation for ${item.applicationId}: ${item.reason}`,
        newState: JSON.stringify({ level: item.level, slaBreachDays: item.slaBreachDays, status: item.status }),
        eventType: 'escalation.raised',
        source: 'system'
      });
    });

    result.resolvedEscalations.forEach((item) => {
      repository.upsertEscalation(item);
      recordAudit({
        action: 'ESCALATION_RESOLVED',
        entityType: 'Escalation',
        entityId: item.id,
        details: `Escalation for ${item.applicationId} closed because the underlying deadline condition cleared.`,
        previousState: JSON.stringify({ level: item.level, status: 'Open' }),
        newState: JSON.stringify({ status: item.status }),
        eventType: 'escalation.resolved',
        source: 'system'
      });
    });

    result.events.forEach((event) => dispatchNotifications([event], findAppForEvent(event)));
  };

  const runSweepRef = useRef(runSweep);
  useEffect(() => {
    runSweepRef.current = runSweep;
  });

  useEffect(() => {
    const kick = window.setTimeout(() => runSweepRef.current(), 0);
    return () => window.clearTimeout(kick);
  }, [applications, evcVisits, undertakings, documents]);

  useEffect(() => {
    const timer = window.setInterval(() => runSweepRef.current(), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const acknowledgeAlert = (id: string) => {
    const alert = alerts.find((item) => item.id === id);
    if (!alert || alert.status !== 'Open') return;
    const updated: SystemAlert = { ...alert, status: 'Acknowledged' };
    setAlerts((prev) => prev.map((item) => (item.id === id ? updated : item)));
    repository.upsertAlert(updated);
    recordAudit({
      action: 'ALERT_ACKNOWLEDGED',
      entityType: 'Alert',
      entityId: alert.id,
      details: `Alert "${alert.title}" acknowledged.`,
      previousState: alert.status,
      newState: updated.status
    });
    showToast('Alert acknowledged', 'info');
  };

  const resolveAlert = (id: string) => {
    const alert = alerts.find((item) => item.id === id);
    if (!alert || alert.status === 'Resolved') return;
    const updated: SystemAlert = { ...alert, status: 'Resolved' };
    setAlerts((prev) => prev.map((item) => (item.id === id ? updated : item)));
    repository.upsertAlert(updated);
    recordAudit({
      action: 'ALERT_RESOLVED',
      entityType: 'Alert',
      entityId: alert.id,
      details: `Alert "${alert.title}" resolved by the responsible officer.`,
      previousState: alert.status,
      newState: updated.status
    });
    showToast('Alert resolved', 'success');
  };

  const acknowledgeEscalation = (id: string) => {
    const escalation = escalations.find((item) => item.id === id);
    if (!escalation || escalation.status === 'Resolved') return;
    const actor = getActor();
    const updated: EscalationItem = {
      ...escalation,
      status: 'Under Review',
      acknowledgedBy: actor.name,
      acknowledgedAt: toIsoDate(getNow())
    };
    setEscalations((prev) => prev.map((item) => (item.id === id ? updated : item)));
    repository.upsertEscalation(updated);
    recordAudit({
      action: 'ESCALATION_ACKNOWLEDGED',
      entityType: 'Escalation',
      entityId: escalation.id,
      details: `Escalation for ${escalation.applicationId} taken under review by ${actor.name}.`,
      previousState: escalation.status,
      newState: updated.status
    });
    showToast('Escalation acknowledged and under review', 'info');
  };

  const resolveEscalation = (id: string) => {
    const escalation = escalations.find((item) => item.id === id);
    if (!escalation || escalation.status === 'Resolved') return;
    const actor = getActor();
    const updated: EscalationItem = {
      ...escalation,
      status: 'Resolved',
      resolvedAt: toIsoDate(getNow())
    };
    setEscalations((prev) => prev.map((item) => (item.id === id ? updated : item)));
    repository.upsertEscalation(updated);
    recordAudit({
      action: 'ESCALATION_RESOLVED',
      entityType: 'Escalation',
      entityId: escalation.id,
      details: `Escalation for ${escalation.applicationId} resolved by ${actor.name}.`,
      previousState: escalation.status,
      newState: updated.status,
      eventType: 'escalation.resolved'
    });
    const event = buildDomainEvent('escalation.resolved', 'Escalation', escalation.id, {
      detail: `Escalation for ${escalation.applicationId} resolved.`,
      applicationId: escalation.applicationId
    });
    dispatchNotifications(
      [event],
      applications.find((app) => app.id === escalation.applicationId) ?? null
    );
    showToast('Escalation resolved and closed', 'success');
  };

  const createEscalation: AppContextType['createEscalation'] = (input) => {
    const actor = getActor();
    const item: EscalationItem = {
      id: `ESC-${Date.now().toString(36).toUpperCase()}`,
      applicationId: input.applicationId,
      instituteName: input.instituteName,
      region: input.region,
      raisedBy: actor.name,
      raisedDate: formatDisplayDate(getNow()),
      urgency: input.urgency,
      reason: input.reason,
      status: 'Open',
      level: 1,
      entityType: 'Application',
      entityId: input.applicationId
    };
    setEscalations((prev) => [item, ...prev]);
    repository.upsertEscalation(item);
    recordAudit({
      action: 'ESCALATION_RAISED',
      entityType: 'Escalation',
      entityId: item.id,
      details: `Manual escalation raised for ${input.applicationId}: ${input.reason}`,
      newState: JSON.stringify({ level: 1, urgency: input.urgency, status: 'Open' }),
      eventType: 'escalation.raised'
    });
    const event = buildDomainEvent('escalation.raised', 'Escalation', item.id, {
      detail: input.reason,
      applicationId: input.applicationId,
      region: input.region
    });
    dispatchNotifications(
      [event],
      applications.find((app) => app.id === input.applicationId) ?? null
    );
    showToast('Escalation dispatched to the central regulatory desk', 'success');
  };

  const setDemoClockOffset = (days: number) => {
    if (getDataMode() !== 'demo') {
      showToast('The demo clock is only available in demo mode.', 'warning');
      return;
    }
    setDemoClockOffsetDays(days);
    if (days === 0) resetNow();
    else setDemoTimeOffsetDays(days);

    const config = resolveWorkflowConfig(authService.getSystemConfig());
    const now = getNow();
    setApplications((prev) => prev.map((app) => refreshApplicationSla(app, config, now)));
    window.setTimeout(() => runSweepRef.current(), 0);
    showToast(
      days === 0 ? 'Demo clock restored to today.' : `Demo clock advanced by ${days} day(s).`,
      'info'
    );
  };

  const resetToInitialData = () => {
    if (repository.isRemote) {
      showToast('Reset is only available in demo mode.', 'warning');
      return;
    }
    clearLocal();
    setDemoClockOffsetDays(0);
    resetNow();

    const newName = getRandomFullName();
    setCurrentUser({
      name: newName,
      role: 'Regional Officer',
      email: `${newName.toLowerCase().replace(/\s+/g, '.')}@aicte-india.org`,
      initials: getInitials(newName)
    });
    setApplications(initialApplications.map((app) => normalizeApplication(app)));
    setInstitutes(initialInstitutes);
    setEvcVisits(initialEVCVisits.map((visit) => normalizeEVCVisit(visit)));
    setComplianceRecords(initialComplianceRecords);
    setDocuments(initialDocuments.map(normalizeDocument));
    setNotifications(initialNotifications);
    setUndertakings(initialUndertakings);
    setAlerts([]);
    setEscalations([]);
    showToast('Reset to original sample data with fresh random names', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        randomizeCurrentUser,
        randomizeAllNames,
        applications,
        institutes,
        evcVisits,
        complianceRecords,
        documents,
        notifications,
        undertakings,
        alerts,
        escalations,
        searchQuery,
        setSearchQuery,
        selectedApplication,
        setSelectedApplication,
        selectedInstitute,
        setSelectedInstitute,
        activeModal,
        setActiveModal,
        transitionApplication,
        checkTransition,
        updateApplicationStage,
        advanceApplication,
        returnApplication,
        approveApplication,
        rejectApplication,
        addNewApplication,
        scheduleEVC,
        cancelEVC,
        rescheduleEVC,
        completeEVC,
        saveVisitChecklist,
        addVisitEvidence,
        removeVisitEvidence,
        uploadCompliance,
        verifyCompliance,
        createUndertaking,
        submitUndertakingEvidence,
        verifyUndertaking,
        rejectUndertaking,
        uploadDocument,
        requestDocumentRenewal,
        submitDocumentRenewal,
        verifyDocument,
        rejectDocument,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        demoClockOffsetDays,
        setDemoClockOffset,
        runSweep,
        acknowledgeAlert,
        resolveAlert,
        acknowledgeEscalation,
        resolveEscalation,
        createEscalation,
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
