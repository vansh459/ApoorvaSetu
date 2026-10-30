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
  status: 'Verified' | 'Pending' | 'Expired';
  fileSize: string;
  fileType: string;
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
  entityType: 'Application' | 'User' | 'EVC' | 'Compliance' | 'Document' | 'System' | 'Auth';
  entityId: string;
  details: string;
  previousState?: string;
  newState?: string;
  ipAddress: string;
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
}
