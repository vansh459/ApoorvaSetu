export type ApplicationStage = 
  | 'Submitted'
  | 'Initial Scrutiny'
  | 'Regional Review'
  | 'Scrutiny / Re-scrutiny'
  | 'Expert Visit Committee (EVC)'
  | 'SAC / SHC'
  | 'Compliance / Undertaking Verification'
  | 'Approval (Subject to Undertaking)'
  | 'Final AICTE Review'
  | 'Final Approval'
  | 'Other Stages';

export type ApplicationStatus = 
  | 'In Progress'
  | 'Pending'
  | 'Action Required'
  | 'Approved'
  | 'Rejected'
  | 'Returned';

export type RouteId =
  | 'ROUTE_SCRUTINY_ONLY'
  | 'ROUTE_SCRUTINY_EVC'
  | 'ROUTE_EVC_SAC'
  | 'ROUTE_EVC_ONLY'
  | 'ROUTE_SCRUTINY_SAC'
  | 'ROUTE_SAC_APPEAL';

export type SlaTier = 'On Track' | 'Approaching' | 'Due Today' | 'Breached' | 'Paused';

export type DataMode = 'demo' | 'supabase';

export interface WorkflowRoute {
  id: RouteId;
  label: string;
  applicationTypes: string[];
  stages: ApplicationStage[];
  requiresEVC: boolean;
  requiresUndertaking: boolean;
  requiresSAC: boolean;
}

export interface StageSla {
  days: number;
  approachingPct: number;
}

export interface EscalationRule {
  level: 1 | 2 | 3;
  breachDays: number;
  targetRoles: UserRole[];
}

export interface NotificationRule {
  eventType: string;
  enabled: boolean;
  channels: ('inapp' | 'email')[];
  notifyRoles: UserRole[];
}

export interface Deficiency {
  code: string;
  note: string;
  stage: ApplicationStage;
  raisedAt: string;
  raisedBy: string;
  resolvedAt?: string;
}

export interface ReturnRecord {
  fromStage: ApplicationStage;
  toStage: ApplicationStage;
  code: string;
  note: string;
  by: string;
  at: string;
  resubmittedAt?: string;
}

export interface ApplicationDecision {
  outcome: 'Approved' | 'Rejected';
  code: string;
  note: string;
  by: string;
  at: string;
  competentAuthority: string;
}

export interface Undertaking {
  id: string;
  applicationId: string;
  instituteId: string;
  instituteName: string;
  region: Region;
  conditionCode: string;
  title: string;
  dueDate: string;
  evidenceDocumentIds: string[];
  submittedAt?: string;
  submittedBy?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  status: 'Pending' | 'Submitted' | 'Verified' | 'Rejected' | 'Overdue' | 'Escalated';
  escalationLevel: number;
}

export interface SystemAlert {
  id: string;
  rule: string;
  entityType: 'Application' | 'EVC' | 'Undertaking' | 'Document';
  entityId: string;
  tier: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  dedupeKey: string;
  createdAt: string;
  status: 'Open' | 'Acknowledged' | 'Resolved';
  title: string;
  description: string;
  link?: string;
  region?: Region;
  instituteId?: string;
  targetRoles?: UserRole[];
}

export type Region = 
  | 'Northern'
  | 'Southern'
  | 'Eastern'
  | 'Western'
  | 'Central'
  | 'North Eastern'
  | 'Others';

export type UserRole = 
  | 'SUPER_ADMIN'
  | 'AICTE_ADMIN'
  | 'REGIONAL_OFFICER'
  | 'EVC_MEMBER'
  | 'INSTITUTION_ADMIN';

export type Permission =
  | 'users.read'
  | 'users.create'
  | 'users.update'
  | 'users.delete'
  | 'roles.manage'
  | 'applications.read'
  | 'applications.create'
  | 'applications.review'
  | 'applications.forward'
  | 'applications.return'
  | 'applications.approve'
  | 'applications.reject'
  | 'institutes.read'
  | 'institutes.update'
  | 'institutes.manage'
  | 'workflow.manage'
  | 'evc.read'
  | 'evc.schedule'
  | 'evc.assign'
  | 'evc.report.submit'
  | 'documents.read'
  | 'documents.upload'
  | 'documents.verify'
  | 'compliance.read'
  | 'compliance.submit'
  | 'compliance.verify'
  | 'reports.read'
  | 'reports.export'
  | 'audit.read'
  | 'system.config';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  permissions: Permission[];
  avatar?: string;
  initials: string;
  phone?: string;
  designation?: string;
  region?: Region;
  instituteId?: string;
  instituteName?: string;
  committeeName?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface ApplicationTimelineEvent {
  stage: string;
  date: string;
  status: 'completed' | 'current' | 'pending';
  officer?: string;
  notes?: string;
  enteredAt?: string;
  dueAt?: string;
  actorId?: string;
  action?: string;
}

export interface Application {
  id: string;
  instituteId: string;
  instituteName: string;
  type: string;
  region: Region;
  state: string;
  stage: ApplicationStage;
  status: ApplicationStatus;
  lastUpdated: string;
  appliedDate: string;
  category: string;
  intakeProposed: number;
  programs: string[];
  contactEmail: string;
  contactPhone: string;
  timeline: ApplicationTimelineEvent[];
  documents: {
    name: string;
    type: string;
    status: 'Verified' | 'Pending' | 'Rejected';
    uploadedOn: string;
  }[];
  remarks?: string;
  routeId?: RouteId;
  stageEnteredAt?: string;
  stageDueAt?: string;
  slaTier?: SlaTier;
  assignedOfficerId?: string;
  deficiencies?: Deficiency[];
  returns?: ReturnRecord[];
  decision?: ApplicationDecision;
  caseSummary?: string;
  evcVisitId?: string;
  version?: number;
  lastActionBy?: string;
}

export interface Institute {
  id: string;
  code: string;
  name: string;
  region: Region;
  state: string;
  city: string;
  category: 'Engineering & Technology' | 'Management' | 'Pharmacy' | 'Architecture' | 'Polytechnic';
  establishedYear: number;
  principalName: string;
  email: string;
  phone: string;
  address: string;
  status: 'Approved' | 'Pending Review' | 'Notice Issued' | 'Suspended';
  approvedSeats: number;
  accreditedPrograms: number;
  complianceScore: number;
  activeApplicationsCount: number;
}

export interface EVCVisit {
  id: string;
  applicationId?: string;
  instituteId: string;
  instituteName: string;
  stateRegion: string;
  region: Region;
  date: string; // YYYY-MM-DD
  displayDate: { day: string; month: string };
  status: 'Scheduled' | 'Pending' | 'Completed' | 'Cancelled';
  assignedCommittee: string;
  committeeMembers: string[];
  mode: 'Physical' | 'Hybrid' | 'Virtual';
  reportSubmitted?: boolean;
  scheduledAt?: string;
  reportDueAt?: string;
  reportSubmittedAt?: string;
  slaTier?: SlaTier;
  escalationLevel?: number;
  report?: InspectionReport;
  checklist?: EVCVisitChecklistItem[];
  evidenceFiles?: string[];
}

export interface EVCVisitChecklistItem {
  id: string;
  passed: boolean;
}

export interface ComplianceRecord {
  id: string;
  title: string;
  category: 'Lease Documents' | 'Institutional Undertakings' | 'Compliance Submissions' | 'Expired Documents' | 'Valid Documents';
  instituteName: string;
  instituteId: string;
  region: Region;
  status: 'Pending' | 'Submitted' | 'Verified' | 'Expired' | 'Critical';
  dueDate: string;
  submissionDate?: string;
  documentRef?: string;
  urgency: 'high' | 'medium' | 'low';
  undertakingId?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  escalationLevel?: number;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: 'Land & Building' | 'Fire Safety' | 'AICTE Approvals' | 'Affiliation' | 'Audit & Finance';
  instituteName: string;
  instituteId: string;
  region: Region;
  uploadDate: string;
  expiryDate: string;
  status: 'Verified' | 'Pending' | 'Expired' | 'Rejected' | 'Superseded';
  fileSize: string;
  fileType: string;
  documentTypeCode?: string;
  renewalOfId?: string;
  renewalStatus?: 'Requested' | 'Submitted' | 'Verified' | 'Rejected';
  renewalNote?: string;
  verifiedBy?: string;
  storagePath?: string;
  expiryTier?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  category: 'application' | 'evc' | 'compliance' | 'system';
  timestamp: string;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
  link?: string;
  targetRole?: UserRole;
  targetRegion?: Region;
  targetInstituteId?: string;
  dedupeKey?: string;
  eventType?: string;
  targetUserId?: string;
}

export interface RegionalOffice {
  id: string;
  region: Region;
  headquarters: string;
  officerName: string;
  designation: string;
  email: string;
  phone: string;
  jurisdiction: string[];
  totalInstitutes: number;
  pendingApplications: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: 'Application' | 'User' | 'EVC' | 'Compliance' | 'Document' | 'System' | 'Auth' | 'Undertaking' | 'Alert' | 'Escalation';
  entityId: string;
  details: string;
  previousState?: string;
  newState?: string;
  ipAddress: string;
  eventType?: string;
  correlationId?: string;
  source?: 'ui' | 'system' | 'cron';
}

export interface SystemConfig {
  maintenanceMode: boolean;
  academicYear: string;
  approvalCycleEndDate: string;
  evcMinMembers: number;
  autoEscalationDays: number;
  notificationEmailAlerts: boolean;
  requireTwoFactorForAdmin: boolean;
  maxUploadSizeMB: number;
  stageSlas?: Partial<Record<ApplicationStage, StageSla>>;
  escalationMatrix?: EscalationRule[];
  notificationRules?: NotificationRule[];
  documentWarningDays?: number[];
  undertakingWarningDays?: number[];
  businessDaysOnly?: boolean;
}

export interface InspectionReport {
  id: string;
  visitId: string;
  applicationId?: string;
  instituteId: string;
  instituteName: string;
  inspectorId: string;
  inspectorName: string;
  visitDate: string;
  submissionDate: string;
  infrastructureScore: number; // 0 - 100
  facultyScore: number; // 0 - 100
  labScore: number; // 0 - 100
  safetyCompliance: boolean;
  recommendations: 'Recommended' | 'Conditional' | 'Not Recommended';
  remarks: string;
  evidenceFiles: string[];
  status: 'Draft' | 'Submitted' | 'Reviewed';
}

export interface EscalationItem {
  id: string;
  applicationId: string;
  instituteName: string;
  region: Region;
  raisedBy: string;
  raisedDate: string;
  urgency: 'Medium' | 'High' | 'Critical';
  reason: string;
  status: 'Open' | 'Under Review' | 'Resolved';
  level?: number;
  slaBreachDays?: number;
  dedupeKey?: string;
  entityType?: 'Application' | 'EVC' | 'Undertaking' | 'Document';
  entityId?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}
