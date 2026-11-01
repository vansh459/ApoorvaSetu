import {
  User,
  UserRole,
  Permission,
  Application,
  Institute,
  EVCVisit,
  ComplianceRecord,
  DocumentItem,
  NotificationItem,
  SystemAlert,
  Undertaking,
  DocumentVerificationReport
} from '../types';

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'users.read',
    'users.create',
    'users.update',
    'users.delete',
    'roles.manage',
    'applications.read',
    'applications.create',
    'applications.review',
    'applications.forward',
    'applications.return',
    'applications.approve',
    'applications.reject',
    'institutes.read',
    'institutes.update',
    'institutes.manage',
    'workflow.manage',
    'evc.read',
    'evc.schedule',
    'evc.assign',
    'evc.report.submit',
    'documents.read',
    'documents.upload',
    'documents.verify',
    'compliance.read',
    'compliance.submit',
    'compliance.verify',
    'reports.read',
    'reports.export',
    'audit.read',
    'system.config'
  ],
  AICTE_ADMIN: [
    'applications.read',
    'applications.review',
    'applications.forward',
    'applications.return',
    'applications.approve',
    'applications.reject',
    'institutes.read',
    'institutes.update',
    'workflow.manage',
    'evc.read',
    'evc.schedule',
    'evc.assign',
    'documents.read',
    'documents.verify',
    'compliance.read',
    'compliance.verify',
    'reports.read',
    'reports.export',
    'audit.read'
  ],
  REGIONAL_OFFICER: [
    'applications.read',
    'applications.review',
    'applications.forward',
    'applications.return',
    'institutes.read',
    'evc.read',
    'evc.schedule',
    'documents.read',
    'documents.verify',
    'compliance.read',
    'compliance.verify',
    'reports.read'
  ],
  EVC_MEMBER: [
    'evc.read',
    'evc.report.submit',
    'institutes.read',
    'documents.read'
  ],
  INSTITUTION_ADMIN: [
    'applications.create',
    'applications.read',
    'institutes.read',
    'institutes.update',
    'documents.read',
    'documents.upload',
    'compliance.read',
    'compliance.submit',
    'evc.read'
  ]
};

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Administrator',
  AICTE_ADMIN: 'AICTE Central Admin',
  REGIONAL_OFFICER: 'Regional Officer',
  EVC_MEMBER: 'EVC Committee Member',
  INSTITUTION_ADMIN: 'Institution Admin'
};

/**
 * Check if a user possesses a specific permission.
 */
export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
  if (!user || !user.isActive) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  return user.permissions.includes(permission);
}

/**
 * Check if a user matches any of the given roles.
 */
export function hasAnyRole(user: User | null | undefined, roles: UserRole[]): boolean {
  if (!user || !user.isActive) return false;
  return roles.includes(user.role);
}

/**
 * Strict data scoping: Filter applications based on user role and jurisdiction.
 * - SUPER_ADMIN & AICTE_ADMIN: All applications.
 * - REGIONAL_OFFICER: ONLY applications belonging to user.region.
 * - INSTITUTION_ADMIN: ONLY applications for user.instituteId.
 * - EVC_MEMBER: Applications linked to visits assigned to this member.
 */
export function filterApplicationsForUser(
  applications: Application[],
  user: User | null | undefined
): Application[] {
  if (!user) return [];
  if (user.role === 'SUPER_ADMIN' || user.role === 'AICTE_ADMIN') {
    return applications;
  }
  if (user.role === 'REGIONAL_OFFICER') {
    if (!user.region) return [];
    return applications.filter((app) => app.region.toLowerCase() === user.region!.toLowerCase());
  }
  if (user.role === 'INSTITUTION_ADMIN') {
    if (!user.instituteId) return [];
    return applications.filter((app) => app.instituteId === user.instituteId);
  }
  if (user.role === 'EVC_MEMBER') {
    // Member only sees applications from their committee / assigned inspections
    return applications.filter((app) =>
      app.stage === 'Expert Visit Committee (EVC)' &&
      (!user.region || app.region.toLowerCase() === user.region.toLowerCase())
    );
  }
  return [];
}

/**
 * Strict data scoping: Filter institutions based on user role and jurisdiction.
 */
export function filterInstitutesForUser(
  institutes: Institute[],
  user: User | null | undefined
): Institute[] {
  if (!user) return [];
  if (user.role === 'SUPER_ADMIN' || user.role === 'AICTE_ADMIN') {
    return institutes;
  }
  if (user.role === 'REGIONAL_OFFICER') {
    if (!user.region) return [];
    return institutes.filter((inst) => inst.region.toLowerCase() === user.region!.toLowerCase());
  }
  if (user.role === 'INSTITUTION_ADMIN') {
    if (!user.instituteId) return [];
    return institutes.filter((inst) => inst.id === user.instituteId);
  }
  if (user.role === 'EVC_MEMBER') {
    // EVC member sees institutes assigned in their visits
    return institutes.filter((inst) =>
      !user.region || inst.region.toLowerCase() === user.region.toLowerCase()
    );
  }
  return [];
}

/**
 * Strict data scoping: Filter EVC Visits.
 */
export function filterEVCVisitsForUser(
  visits: EVCVisit[],
  user: User | null | undefined
): EVCVisit[] {
  if (!user) return [];
  if (user.role === 'SUPER_ADMIN' || user.role === 'AICTE_ADMIN') {
    return visits;
  }
  if (user.role === 'REGIONAL_OFFICER') {
    if (!user.region) return [];
    return visits.filter((v) => v.region.toLowerCase() === user.region!.toLowerCase());
  }
  if (user.role === 'INSTITUTION_ADMIN') {
    if (!user.instituteId) return [];
    return visits.filter((v) => v.instituteId === user.instituteId);
  }
  if (user.role === 'EVC_MEMBER') {
    // EVC member sees visits where they are assigned or committee matches
    return visits.filter(
      (v) =>
        (user.committeeName &&
          v.assignedCommittee.toLowerCase().includes(user.committeeName.toLowerCase())) ||
        v.committeeMembers.some((m) => m.toLowerCase().includes(user.name.toLowerCase()))
    );
  }
  return [];
}

/**
 * Strict data scoping: Filter system alerts.
 * Alerts carry target roles plus the jurisdiction they were raised for.
 */
export function filterAlertsForUser(
  alerts: SystemAlert[],
  user: User | null | undefined
): SystemAlert[] {
  if (!user || !user.isActive) return [];
  if (user.role === 'SUPER_ADMIN') return alerts;
  return alerts.filter((alert) => {
    if (alert.targetRoles && !alert.targetRoles.includes(user.role)) return false;
    if (
      (user.role === 'REGIONAL_OFFICER' || user.role === 'EVC_MEMBER') &&
      alert.region &&
      alert.region.toLowerCase() !== user.region?.toLowerCase()
    ) {
      return false;
    }
    if (
      user.role === 'INSTITUTION_ADMIN' &&
      alert.instituteId &&
      alert.instituteId !== user.instituteId
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Strict data scoping: Filter Compliance Records.
 */
export function filterComplianceForUser(
  records: ComplianceRecord[],
  user: User | null | undefined
): ComplianceRecord[] {
  if (!user) return [];
  if (user.role === 'SUPER_ADMIN' || user.role === 'AICTE_ADMIN') {
    return records;
  }
  if (user.role === 'REGIONAL_OFFICER') {
    if (!user.region) return [];
    return records.filter((r) => r.region.toLowerCase() === user.region!.toLowerCase());
  }
  if (user.role === 'INSTITUTION_ADMIN') {
    if (!user.instituteId) return [];
    return records.filter((r) => r.instituteId === user.instituteId);
  }
  return [];
}

/**
 * Strict data scoping: Filter time-bound undertakings.
 */
export function filterUndertakingsForUser(
  undertakings: Undertaking[],
  user: User | null | undefined
): Undertaking[] {
  if (!user) return [];
  if (user.role === 'SUPER_ADMIN' || user.role === 'AICTE_ADMIN') {
    return undertakings;
  }
  if (user.role === 'REGIONAL_OFFICER') {
    if (!user.region) return [];
    return undertakings.filter((u) => u.region.toLowerCase() === user.region!.toLowerCase());
  }
  if (user.role === 'INSTITUTION_ADMIN') {
    if (!user.instituteId) return [];
    return undertakings.filter((u) => u.instituteId === user.instituteId);
  }
  return [];
}

/**
 * Strict data scoping: Filter Documents.
 */
export function filterDocumentsForUser(
  documents: DocumentItem[],
  user: User | null | undefined
): DocumentItem[] {
  if (!user) return [];
  if (user.role === 'SUPER_ADMIN' || user.role === 'AICTE_ADMIN') {
    return documents;
  }
  if (user.role === 'REGIONAL_OFFICER') {
    if (!user.region) return [];
    return documents.filter((d) => d.region.toLowerCase() === user.region!.toLowerCase());
  }
  if (user.role === 'INSTITUTION_ADMIN') {
    if (!user.instituteId) return [];
    return documents.filter((d) => d.instituteId === user.instituteId);
  }
  if (user.role === 'EVC_MEMBER') {
    // EVC member sees documents relevant to inspection institutes
    return documents.filter((d) =>
      !user.region || d.region.toLowerCase() === user.region.toLowerCase()
    );
  }
  return [];
}

/**
 * Strict data scoping for AI verification reports. Mirrors document scoping.
 */
export function filterDocumentVerificationsForUser(
  reports: DocumentVerificationReport[],
  user: User | null | undefined
): DocumentVerificationReport[] {
  if (!user) return [];
  if (user.role === 'SUPER_ADMIN' || user.role === 'AICTE_ADMIN') {
    return reports;
  }
  if (user.role === 'REGIONAL_OFFICER') {
    if (!user.region) return [];
    return reports.filter((report) => report.region.toLowerCase() === user.region!.toLowerCase());
  }
  if (user.role === 'INSTITUTION_ADMIN') {
    if (!user.instituteId) return [];
    return reports.filter((report) => report.instituteId === user.instituteId);
  }
  return [];
}

/**
 * Strict data scoping: Filter Notifications.
 */
export function filterNotificationsForUser(
  notifications: NotificationItem[],
  user: User | null | undefined
): NotificationItem[] {
  if (!user) return [];
  if (user.role === 'SUPER_ADMIN' || user.role === 'AICTE_ADMIN') {
    return notifications;
  }
  return notifications.filter((n) => {
    // If targeted to a specific role
    if (n.targetRole && n.targetRole !== user.role) return false;
    // If targeted to a specific region
    if (n.targetRegion && user.region && n.targetRegion.toLowerCase() !== user.region.toLowerCase()) {
      return false;
    }
    // If targeted to a specific institute
    if (n.targetInstituteId && user.instituteId && n.targetInstituteId !== user.instituteId) {
      return false;
    }
    return true;
  });
}

