import type { AuditLog, SystemConfig, User } from '../types';
import { ROLE_DEFAULT_PERMISSIONS } from '../services/rbacService';

// Standard demo password across all seeded accounts
export const DEMO_PASSWORD = 'Apoorva@2026';

// Initial 5 seeded users
export const INITIAL_USERS: (User & { passwordHash?: string })[] = [
  {
    id: 'USR-SUPERADMIN',
    name: 'Dr. Ramesh Pokhriyal',
    email: 'superadmin@apoorvasetu.demo',
    role: 'SUPER_ADMIN',
    roleTitle: 'Super Administrator',
    designation: 'Chief Technology Officer & Governance Lead',
    initials: 'RP',
    phone: '+91 11 29581001',
    permissions: ROLE_DEFAULT_PERMISSIONS.SUPER_ADMIN,
    isActive: true,
    createdAt: '2026-01-15T09:00:00Z',
    lastLogin: '2026-10-30T11:20:00Z'
  },
  {
    id: 'USR-AICTEADMIN',
    name: 'Amit Sharma',
    email: 'aicteadmin@apoorvasetu.demo',
    role: 'AICTE_ADMIN',
    roleTitle: 'AICTE Central Admin',
    designation: 'Advisor-I (Approval Bureau), AICTE HQ',
    initials: 'AS',
    phone: '+91 11 29581020',
    permissions: ROLE_DEFAULT_PERMISSIONS.AICTE_ADMIN,
    isActive: true,
    createdAt: '2026-01-20T10:00:00Z',
    lastLogin: '2026-10-30T11:24:00Z'
  },
  {
    id: 'USR-REGIONAL-NORTH',
    name: 'Dr. R. K. Sharma',
    email: 'regional@apoorvasetu.demo',
    role: 'REGIONAL_OFFICER',
    roleTitle: 'Regional Officer (Northern Region)',
    designation: 'Regional Officer, Northern Regional Office (Kanpur)',
    initials: 'RS',
    region: 'Northern',
    phone: '+91 512 2580012',
    permissions: ROLE_DEFAULT_PERMISSIONS.REGIONAL_OFFICER,
    isActive: true,
    createdAt: '2026-02-01T09:30:00Z',
    lastLogin: '2026-10-30T10:15:00Z'
  },
  {
    id: 'USR-EVC-MEMBER',
    name: 'Prof. S. Banerjee',
    email: 'evc@apoorvasetu.demo',
    role: 'EVC_MEMBER',
    roleTitle: 'EVC Committee Member',
    designation: 'Senior Inspector & Chairman, EVC Panel North-A',
    initials: 'SB',
    committeeName: 'EVC Committee North-A',
    region: 'Northern',
    phone: '+91 94330 87120',
    permissions: ROLE_DEFAULT_PERMISSIONS.EVC_MEMBER,
    isActive: true,
    createdAt: '2026-02-15T11:00:00Z',
    lastLogin: '2026-10-29T16:45:00Z'
  },
  {
    id: 'USR-INSTITUTE-ADMIN',
    name: 'Dr. K. S. Murthy',
    email: 'institute@apoorvasetu.demo',
    role: 'INSTITUTION_ADMIN',
    roleTitle: 'Institution Administrator',
    designation: 'Principal & Head of Institution',
    initials: 'KM',
    instituteId: 'INST-101',
    instituteName: 'ABC Institute of Tech',
    region: 'Northern',
    phone: '+91 98765 43210',
    permissions: ROLE_DEFAULT_PERMISSIONS.INSTITUTION_ADMIN,
    isActive: true,
    createdAt: '2026-03-01T14:00:00Z',
    lastLogin: '2026-10-30T09:10:00Z'
  }
];

// Initial Audit Logs
export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'LOG-1001',
    timestamp: '30 Oct 2026, 11:24 AM',
    userId: 'USR-AICTEADMIN',
    userName: 'Amit Sharma',
    userRole: 'AICTE_ADMIN',
    action: 'APPLICATION_FORWARDED',
    entityType: 'Application',
    entityId: 'APP2026-0012',
    details: 'Application for ABC Institute of Tech advanced to Expert Visit Committee stage.',
    previousState: 'Scrutiny Completed',
    newState: 'EVC Scheduling',
    ipAddress: '10.24.1.84'
  },
  {
    id: 'LOG-1002',
    timestamp: '30 Oct 2026, 11:05 AM',
    userId: 'USR-SUPERADMIN',
    userName: 'Dr. Ramesh Pokhriyal',
    userRole: 'SUPER_ADMIN',
    action: 'SYSTEM_CONFIG_UPDATED',
    entityType: 'System',
    entityId: 'SYS-GLOBAL',
    details: 'Academic cycle approval deadline verified for AY 2026-27.',
    previousState: 'Open',
    newState: 'Open',
    ipAddress: '10.24.0.12'
  },
  {
    id: 'LOG-1003',
    timestamp: '30 Oct 2026, 10:15 AM',
    userId: 'USR-REGIONAL-NORTH',
    userName: 'Dr. R. K. Sharma',
    userRole: 'REGIONAL_OFFICER',
    action: 'DOCUMENT_VERIFIED',
    entityType: 'Document',
    entityId: 'DOC-501',
    details: 'Fire Safety Certificate approved for IIT Kanpur campus extension.',
    previousState: 'Pending Review',
    newState: 'Verified',
    ipAddress: '192.168.10.45'
  },
  {
    id: 'LOG-1004',
    timestamp: '29 Oct 2026, 04:30 PM',
    userId: 'USR-EVC-MEMBER',
    userName: 'Prof. S. Banerjee',
    userRole: 'EVC_MEMBER',
    action: 'INSPECTION_REPORT_SUBMITTED',
    entityType: 'EVC',
    entityId: 'EVC-1',
    details: 'Inspection report and lab infrastructure evaluation submitted for IIT Madras.',
    previousState: 'Scheduled',
    newState: 'Report Submitted',
    ipAddress: '172.16.8.23'
  },
  {
    id: 'LOG-1005',
    timestamp: '28 Oct 2026, 02:15 PM',
    userId: 'USR-INSTITUTE-ADMIN',
    userName: 'Dr. K. S. Murthy',
    userRole: 'INSTITUTION_ADMIN',
    action: 'UNDERTAKING_SUBMITTED',
    entityType: 'Compliance',
    entityId: 'COMP-201',
    details: 'Mandatory anti-ragging and barrier-free affidavit submitted digitally.',
    previousState: 'Pending',
    newState: 'Submitted',
    ipAddress: '203.115.112.4'
  }
];

export const INITIAL_CONFIG: SystemConfig = {
  maintenanceMode: false,
  academicYear: '2026-2027',
  approvalCycleEndDate: '2026-12-31',
  evcMinMembers: 3,
  autoEscalationDays: 7,
  notificationEmailAlerts: true,
  requireTwoFactorForAdmin: false,
  maxUploadSizeMB: 25
};
