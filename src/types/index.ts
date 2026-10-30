export type ApplicationStage = 
  | 'Submitted'
  | 'Scrutiny / Re-scrutiny'
  | 'Expert Visit Committee (EVC)'
  | 'SAC / SHC'
  | 'Approval (Subject to Undertaking)'
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
