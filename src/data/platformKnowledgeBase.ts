import type { UserRole } from '../types/index.ts';

export interface ActionLink {
  label: string;
  path: string;
  requiredRoles?: UserRole[];
}

export interface KnowledgeArticle {
  id: string;
  category:
  | 'general'
  | 'applications'
  | 'workflow'
  | 'institutes'
  | 'evc'
  | 'compliance'
  | 'documents'
  | 'regional'
  | 'admin'
  | 'institution';
  title: string;
  keywords: string[];
  allowedRoles?: UserRole[]; // If specified, only available to these roles
  summary: string;
  content: string;
  actionLinks?: ActionLink[];
}

export const PLATFORM_KNOWLEDGE_BASE: KnowledgeArticle[] = [
  // ---------------- GENERAL PLATFORM ----------------
  {
    id: 'gen-01',
    category: 'general',
    title: 'About ApoorvaSetu Platform',
    keywords: ['about', 'apoorvasetu', 'what is', 'overview', 'purpose', 'aicte approval system', 'features'],
    summary: 'ApoorvaSetu is an AICTE Approval Workflow Automation, Compliance Monitoring, and Alert Management System designed for Smart India Hackathon 2026.',
    content: `**ApoorvaSetu** is the centralized digital governance platform for the All India Council for Technical Education (AICTE).

Key capabilities:
• **Approval Pipeline Automation**: End-to-end tracking from application submission to final Letter of Approval (LoA).
• **Role-Based Access Control (RBAC)**: Dedicated workspaces for 5 distinct roles with strict jurisdictional isolation.
• **Expert Visit Committee (EVC) Operations**: Automated committee assignment, scheduling, inspection checklists, and geo-tagged evidence.
• **Compliance & Undertakings**: Automated expiry alerts, affidavit tracking, and institutional deficiency monitoring.
• **Tamper-Evident Audit Logging**: Cryptographically signed audit trail recording every approval decision.`,
    actionLinks: [
      { label: 'Open Dashboard', path: '/' },
      { label: 'View Workflow Pipeline', path: '/workflow' }
    ]
  },
  {
    id: 'gen-02',
    category: 'general',
    title: 'User Roles & Permissions Overview',
    keywords: ['roles', 'permissions', 'who can do what', 'user role', 'responsibilities', 'super admin', 'aicte admin', 'regional officer', 'evc member', 'institution admin'],
    summary: 'ApoorvaSetu operates on 5 strict roles: Super Admin, AICTE Central Admin, Regional Officer, EVC Committee Member, and Institution Admin.',
    content: `ApoorvaSetu enforces strict multi-tier governance across **5 distinct roles**:

1. **Super Admin**: System configuration, user provisioning, global audit logs, and platform security.
2. **AICTE Central Admin**: National regulatory oversight, workflow stage movement, and final approval decisions.
3. **Regional Officer**: Jurisdiction-specific application review, scrutiny validation, and EVC coordination.
4. **EVC Committee Member**: Physical/hybrid campus inspections, facility checklists, and report submission.
5. **Institution Admin**: Application submission, compliance undertakings, document filing, and progress tracking.`,
    actionLinks: [
      { label: 'View Institutes Directory', path: '/institutes' }
    ]
  },

  // ---------------- APPLICATIONS & WORKFLOW ----------------
  {
    id: 'app-01',
    category: 'applications',
    title: 'How to Submit a New Approval Application',
    keywords: ['submit application', 'apply', 'new application', 'extension of approval', 'eoa', 'intake increase', 'how to apply'],
    allowedRoles: ['INSTITUTION_ADMIN', 'SUPER_ADMIN'],
    summary: 'Institution Admins can submit new technical campus or Extension of Approval (EoA) applications directly from the portal.',
    content: `To submit an application for AICTE approval:

1. Navigate to **Submit Application** in your sidebar (or click the button below).
2. Choose your application category (**Extension of Approval**, **New Technical Campus**, or **Increase in Intake**).
3. Specify your institution details, proposed intake capacity, and target engineering/management programs.
4. Upload mandatory primary documents (Society Registration, Land Title, Building Plan Approval).
5. Verify your contact details and click **Submit Application**.

Once filed, your application receives a unique tracking ID (e.g. \`AICTE/2025/12876\`) and immediately moves to the **Scrutiny** stage.`,
    actionLinks: [
      { label: 'Submit Application Form', path: '/institution/apply', requiredRoles: ['INSTITUTION_ADMIN', 'SUPER_ADMIN'] },
      { label: 'Track Applications', path: '/institution/tracking', requiredRoles: ['INSTITUTION_ADMIN', 'SUPER_ADMIN'] }
    ]
  },
  {
    id: 'app-02',
    category: 'applications',
    title: 'How to Track Application Progress and Timeline',
    keywords: ['track application', 'status', 'progress', 'where is my application', 'tracking', 'timeline', 'current stage'],
    summary: 'Track real-time progress across the 6 approval pipeline stages with officer notes and timestamps.',
    content: `To track an application's real-time journey:

• **Institution Admins**: Go to **Application Tracking** to see an interactive step-by-step pipeline view showing completed, current, and upcoming stages.
• **Officers & Admins**: Go to **Applications**, click on any record, and select **View Dossier** to see the chronological event history.

Stages tracked:
1. **Submitted**: Online registration completed.
2. **Scrutiny / Re-scrutiny**: Document and deficiency review by Regional Scrutiny Committee.
3. **Expert Visit Committee (EVC)**: Campus physical inspection.
4. **SAC / SHC**: Standing Appellate/Hearing Committee review.
5. **Approval (Subject to Undertaking)**: Compliance verification.
6. **Final Approval**: Letter of Approval issuance.`,
    actionLinks: [
      { label: 'Open Application Tracking', path: '/institution/tracking', requiredRoles: ['INSTITUTION_ADMIN', 'SUPER_ADMIN'] },
      { label: 'Browse Applications List', path: '/applications' }
    ]
  },
  {
    id: 'app-03',
    category: 'applications',
    title: 'Understanding Application Statuses',
    keywords: ['application status', 'pending at current stage', 'action required', 'in progress', 'approved', 'rejected', 'returned', 'status meaning'],
    summary: 'Definitions of all application statuses: In Progress, Pending, Action Required, Approved, Rejected, and Returned.',
    content: `Applications in ApoorvaSetu carry one of six statuses:

• **In Progress**: Application is undergoing active review by the assigned scrutiny committee or regional officer.
• **Pending**: Waiting for an upcoming scheduled event (such as an EVC visit date or hearing bench session).
• **Action Required**: Deficiencies or missing documentation have been identified; the institution must upload corrections.
• **Returned**: Application returned to institution for revision before it can proceed forward.
• **Approved**: Formal approval granted by the AICTE Competent Authority.
• **Rejected**: Application rejected due to unfulfilled statutory norms with reasons recorded in the audit log.`,
    actionLinks: [
      { label: 'View Filtered Applications', path: '/applications' }
    ]
  },
  {
    id: 'app-04',
    category: 'workflow',
    title: 'Approval Pipeline & SLA Benchmarks',
    keywords: ['workflow', 'stages', 'approval stages', 'pipeline', 'sla', 'days', 'scrutiny', 'evc stage', 'sac shc'],
    summary: 'The 6 standard AICTE approval stages and average processing timelines.',
    content: `The ApoorvaSetu workflow enforces AICTE Approval Process Handbook (APH) guidelines:

1. **Submitted & Auto-Ack** (~2 days average): Initial filing and fee confirmation.
2. **Scrutiny / Re-scrutiny** (~8 days): Deficiency examination by Regional Scrutiny Committee.
3. **Expert Visit Committee (EVC)** (~12 days): Physical or hybrid infrastructure inspection.
4. **SAC / SHC Review** (~6 days): Appellate hearings for resolving contestations.
5. **Compliance Verification** (~4 days): Verification of legal undertakings and affidavits.
6. **Final AICTE Approval** (~3 days): Competent Authority signing and LoA generation.`,
    actionLinks: [
      { label: 'Open Workflow Overview', path: '/workflow' }
    ]
  },

  // ---------------- EVC INSPECTIONS ----------------
  {
    id: 'evc-01',
    category: 'evc',
    title: 'How EVC Visits are Scheduled',
    keywords: ['schedule evc', 'evc scheduling', 'expert visit committee', 'inspection visit', 'committee assignment', 'how to schedule evc'],
    allowedRoles: ['AICTE_ADMIN', 'REGIONAL_OFFICER', 'SUPER_ADMIN'],
    summary: 'How AICTE Admins and Regional Officers schedule inspection visits and appoint expert committees.',
    content: `To schedule an Expert Visit Committee (EVC) inspection:

1. Open **EVC Scheduling** from the sidebar.
2. Click **Schedule New EVC Visit** at the top right.
3. Select the target institution and application reference.
4. Appoint committee members (academic experts from IITs, NITs, and state universities).
5. Choose visit mode (**Physical**, **Hybrid**, or **Virtual**) and set the date.
6. Submit the schedule. Automated notifications will be sent to the appointed experts and the institution.`,
    actionLinks: [
      { label: 'Open EVC Scheduling', path: '/evc-scheduling' }
    ]
  },
  {
    id: 'evc-02',
    category: 'evc',
    title: 'Completing EVC Inspection Checklist & Evidence Upload',
    keywords: ['evc checklist', 'inspection checklist', 'evidence upload', 'submit report', 'inspection score', 'infrastructure score'],
    allowedRoles: ['EVC_MEMBER', 'SUPER_ADMIN'],
    summary: 'Guidance for EVC Committee Members on recording observations and submitting inspection findings.',
    content: `As an appointed EVC Committee Member:

1. Go to **My Assigned Visits** to view scheduled campus visits.
2. Click **Inspection Checklist** during or after the campus visit.
3. Evaluate institutional parameters across:
   • **Infrastructure**: Campus area, classrooms, administrative block, ramp access.
   • **Faculty Cadre Ratio**: Professor to student ratios and biometric compliance.
   • **Laboratories & Equipment**: Operational safety, high-end equipment availability.
   • **Safety Compliance**: Fire safety NOC, barrier-free access, anti-ragging cell.
4. Open **Evidence Upload** to attach geo-tagged site photographs and signed physical verification forms.
5. Select your recommendation (**Recommended**, **Conditional**, or **Not Recommended**) and submit.`,
    actionLinks: [
      { label: 'View My Assigned Visits', path: '/evc/my-visits', requiredRoles: ['EVC_MEMBER', 'SUPER_ADMIN'] },
      { label: 'Open Inspection Checklist', path: '/evc/checklist', requiredRoles: ['EVC_MEMBER', 'SUPER_ADMIN'] },
      { label: 'Upload Evidence', path: '/evc/evidence', requiredRoles: ['EVC_MEMBER', 'SUPER_ADMIN'] }
    ]
  },

  // ---------------- COMPLIANCE & DOCUMENTS ----------------
  {
    id: 'doc-01',
    category: 'compliance',
    title: 'Managing Compliance Submissions & Undertakings',
    keywords: ['compliance', 'undertakings', 'lease documents', 'expired documents', 'affidavits', 'upload compliance', 'deficiency'],
    summary: 'How to manage regulatory undertakings, land lease documents, and mandatory compliance filings.',
    content: `The **Undertakings & Compliance** module tracks mandatory statutory filings:

• **Categories**:
  - Institutional Undertakings (Anti-Ragging, Fee Committee compliance)
  - Land & Building Lease Deeds
  - Fire & Life Safety Certificates
  - Environmental & Municipal Clearances
• **Urgency Levels**: High, Medium, and Low based on impending due dates.
• **Uploading Compliance**: Click **Upload Compliance Submission** to attach valid documents before the deadline.
• **Verification**: Regional Officers verify submitted undertakings to clear deficiencies.`,
    actionLinks: [
      { label: 'Open Compliance Dashboard', path: '/compliance' },
      { label: 'View Documents Repository', path: '/documents' }
    ]
  },
  {
    id: 'doc-02',
    category: 'documents',
    title: 'Document Repository & Expiry Tracking',
    keywords: ['documents', 'upload document', 'document expiry', 'verified documents', 'fire safety certificate', 'land deed'],
    summary: 'Centralized repository of verified, pending, and expiring institutional certificates.',
    content: `The **Documents** module acts as a tamper-evident digital locker for all technical colleges:

• **Supported Categories**: Land & Building, Fire Safety, AICTE Approvals, University Affiliation, and Audit & Finance.
• **Status Indicators**:
  - **Verified**: Authenticated by Regional Officers.
  - **Pending**: Awaiting scrutiny examination.
  - **Expired**: Certificate has lapsed and requires immediate renewal.
• **Actions**: You can filter by region, search document titles, and view document details.`,
    actionLinks: [
      { label: 'Open Documents Module', path: '/documents' }
    ]
  },

  // ---------------- REGIONAL OPERATIONS & ESCALATIONS ----------------
  {
    id: 'reg-01',
    category: 'regional',
    title: 'Regional Officer Responsibilities & Escalations',
    keywords: ['regional officer', 'escalations', 'regional applications', 'document verification', 'regional jurisdiction'],
    allowedRoles: ['REGIONAL_OFFICER', 'SUPER_ADMIN'],
    summary: 'Jurisdictional duties of Regional Officers and managing critical institutional escalations.',
    content: `Regional Officers manage technical institutions within their assigned region:

• **Regional Applications**: Review and forward eligible applications to EVC or SAC stage.
• **Document Verification**: Scrutinize uploaded certificates and issue deficiency notices.
• **EVC Coordination**: Facilitate logistics and schedule coordination for appointed expert committees.
• **Escalations Tracker**: In **Escalations**, track critical disputes, litigation notices, and land deficiencies requiring central AICTE intervention.`,
    actionLinks: [
      { label: 'View Regional Escalations', path: '/regional/escalations', requiredRoles: ['REGIONAL_OFFICER', 'SUPER_ADMIN'] },
      { label: 'Browse Regional Applications', path: '/applications' }
    ]
  },

  // ---------------- SUPER ADMIN GOVERNANCE ----------------
  {
    id: 'adm-01',
    category: 'admin',
    title: 'User Management & Role Provisioning',
    keywords: ['user management', 'create user', 'edit user', 'deactivate user', 'assign role', 'manage users'],
    allowedRoles: ['SUPER_ADMIN'],
    summary: 'Super Admin operations for provisioning users, managing officer accounts, and deactivating sessions.',
    content: `Super Admins have full authority over portal user accounts:

1. Open **User Management** from the sidebar.
2. View all active and deactivated accounts across AICTE HQ, Regional Offices, EVC Committees, and Institutions.
3. Click **Add New User** to provision accounts with pre-assigned roles, regional scopes, and official email addresses.
4. Toggle active/inactive status to instantly revoke platform access for any account.`,
    actionLinks: [
      { label: 'Open User Management', path: '/admin/users', requiredRoles: ['SUPER_ADMIN'] }
    ]
  },
  {
    id: 'adm-02',
    category: 'admin',
    title: 'Role & Permissions Matrix (RBAC)',
    keywords: ['role permissions', 'rbac matrix', 'manage permissions', 'change role permissions', 'access control'],
    allowedRoles: ['SUPER_ADMIN'],
    summary: 'Configuring system-wide permissions across all 5 roles.',
    content: `The **Role & Permissions** page allows the Super Admin to configure granular capabilities:

• Governance categories:
  - User & Access Governance (\`users.read\`, \`users.create\`, \`roles.manage\`)
  - Application Processing (\`applications.read\`, \`applications.forward\`, \`applications.approve\`)
  - EVC Management (\`evc.read\`, \`evc.schedule\`, \`evc.report.submit\`)
  - Compliance & Documents (\`compliance.verify\`, \`documents.upload\`)
  - System Security & Audit (\`audit.read\`, \`system.config\`)

Click **Save Matrix** to persist updated permissions immediately.`,
    actionLinks: [
      { label: 'Configure Role Permissions', path: '/admin/roles', requiredRoles: ['SUPER_ADMIN'] }
    ]
  },
  {
    id: 'adm-03',
    category: 'admin',
    title: 'Audit Logs & Tamper-Evident History',
    keywords: ['audit logs', 'audit trail', 'security logs', 'activity history', 'who approved', 'ip address'],
    allowedRoles: ['SUPER_ADMIN'],
    summary: 'Immutable audit logs tracking every administrative action, stage transition, and authentication event.',
    content: `The **Audit Logs** module records an immutable trail of system events:

• Captured attributes: Timestamp, User ID, User Name, Role, Action Type, Entity Type, Entity ID, and IP address.
• Actions audited: User Logins, Application Approvals, Rejections, Stage Updates, EVC Scheduling, and Permission Updates.
• You can filter logs by Entity Type or search by user and application ID.`,
    actionLinks: [
      { label: 'View Audit Logs', path: '/admin/audit-logs', requiredRoles: ['SUPER_ADMIN'] }
    ]
  },
  {
    id: 'adm-04',
    category: 'admin',
    title: 'System Configuration Settings',
    keywords: ['system config', 'settings', 'maintenance mode', 'academic year', 'approval cycle end date', 'two factor'],
    allowedRoles: ['SUPER_ADMIN'],
    summary: 'Configuring global portal settings, maintenance mode, and cycle dates.',
    content: `The **System Configuration** page controls platform-wide parameters:

• **Maintenance Mode**: Restrict portal access for scheduled system updates.
• **Academic Year**: Current active approval cycle (e.g., 2026-2027).
• **Approval Cycle Deadline**: Cut-off date for accepting new applications.
• **Minimum EVC Committee Quorum**: Required number of experts per inspection panel.
• **Auto-Escalation Window**: Days before pending scrutiny tasks escalate to Regional Directors.`,
    actionLinks: [
      { label: 'Open System Configuration', path: '/admin/system-config', requiredRoles: ['SUPER_ADMIN'] }
    ]
  },

  // ---------------- NOTIFICATIONS & REPORTS ----------------
  {
    id: 'notif-01',
    category: 'general',
    title: 'Notifications & Priority Alerts',
    keywords: ['notifications', 'alerts', 'reminders', 'unread alerts', 'high priority'],
    summary: 'Real-time alert center for statutory deadlines, EVC updates, and compliance notices.',
    content: `The **Notifications** center alerts users to critical time-sensitive events:

• Priority tabs: **All**, **Unread**, and **High Priority**.
• Actionable links: Clicking any notification directs you directly to the relevant application, EVC schedule, or compliance record.
• Unread badges on the sidebar and header keep you updated on pending actions.`,
    actionLinks: [
      { label: 'View Notifications', path: '/notifications' }
    ]
  },
  {
    id: 'rep-01',
    category: 'general',
    title: 'Generating Reports & Evidence Dossiers',
    keywords: ['reports', 'download report', 'analytics', 'evidence dossiers', 'export data', 'regional performance'],
    summary: 'Generate standardized AICTE reports, approval statistics, and regional performance charts.',
    content: `The **Reports & Evidence** module allows authorized officials to:

• View aggregated application statistics by status and region.
• Monitor stage-wise movement and throughput bottlenecks.
• Click **Generate Report** to export application records, EVC inspection findings, or compliance dossiers in CSV or PDF formats.`,
    actionLinks: [
      { label: 'Open Reports & Analytics', path: '/reports' }
    ]
  }
];

export const SUGGESTED_QUESTIONS_BY_ROUTE: Record<string, string[]> = {
  '/': [
    'What are my responsibilities in this role?',
    'What does Pending at Current Stage mean?',
    'How do I track application progress?'
  ],
  '/applications': [
    'How do I filter applications by stage?',
    'What do the different application statuses mean?',
    'Why was an application returned?'
  ],
  '/institutes': [
    'How is the institutional compliance score calculated?',
    'What categories of technical institutions are registered?',
    'Where can I view an institution dossier?'
  ],
  '/workflow': [
    'What are the 6 stages of the AICTE approval workflow?',
    'What happens during Scrutiny vs EVC stage?',
    'What is the role of the SAC / SHC committee?'
  ],
  '/evc-scheduling': [
    'How do I schedule an EVC inspection visit?',
    'What are the quorum rules for EVC committees?',
    'How are physical vs hybrid visits conducted?'
  ],
  '/compliance': [
    'How do I upload an institutional undertaking?',
    'What documents are required for land compliance?',
    'How do I resolve a high-urgency compliance alert?'
  ],
  '/documents': [
    'What document categories can be stored in the repository?',
    'How do I verify a submitted document?',
    'What happens when a fire safety certificate expires?'
  ],
  '/reports': [
    'How do I download an application summary report?',
    'Where can I see regional performance metrics?'
  ],
  '/admin/users': [
    'How do I provision a new Regional Officer or Admin?',
    'How do I deactivate a compromised user account?'
  ],
  '/admin/roles': [
    'How do I update permissions for a specific role?',
    'What permissions are assigned by default?'
  ],
  '/admin/system-config': [
    'How do I enable Maintenance Mode?',
    'How do I set the approval cycle cut-off date?'
  ],
  '/admin/audit-logs': [
    'How do I search audit logs for a specific application?',
    'What administrative actions are logged?'
  ],
  '/regional/escalations': [
    'How do I escalate an unresolved dispute to AICTE Admin?',
    'What types of issues require central escalation?'
  ],
  '/evc/my-visits': [
    'How do I access details of my assigned inspection visit?',
    'How do I submit the final inspection report?'
  ],
  '/evc/checklist': [
    'What parameters are evaluated in the EVC checklist?',
    'What are the guidelines for Infrastructure scoring?'
  ],
  '/evc/evidence': [
    'How do I upload geo-tagged photos of campus facilities?',
    'What format should inspection evidence files be in?'
  ],
  '/institution/apply': [
    'How do I submit a new Extension of Approval application?',
    'What documents are mandatory for initial submission?'
  ],
  '/institution/tracking': [
    'How do I check the real-time status of my application?',
    'What should I do if my application is in Action Required status?'
  ],
  '/institution/profile': [
    'How do I update the Principal or Registrar contact details?',
    'Where do I view accredited programs and approved intake?'
  ]
};

