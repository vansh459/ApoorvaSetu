import type {
  Application,
  ApplicationStage,
  ApplicationStatus,
  ComplianceRecord,
  DocumentItem,
  EscalationItem,
  EVCVisit,
  NotificationItem,
  Region,
  SlaTier,
  SystemAlert,
  SystemConfig,
  Undertaking
} from '../src/types/index.ts';
import { HttpError } from './http.ts';
import { optionalString, requireString } from './validate.ts';
import type { TransitionAction } from '../src/workflow/types.ts';

type Body = Record<string, unknown>;

const REGIONS: Region[] = ['Northern', 'Southern', 'Eastern', 'Western', 'Central', 'North Eastern', 'Others'];
const STAGES: ApplicationStage[] = [
  'Submitted',
  'Initial Scrutiny',
  'Regional Review',
  'Scrutiny / Re-scrutiny',
  'Expert Visit Committee (EVC)',
  'SAC / SHC',
  'Compliance / Undertaking Verification',
  'Approval (Subject to Undertaking)',
  'Final AICTE Review',
  'Final Approval',
  'Other Stages'
];
const APPLICATION_STATUSES: ApplicationStatus[] = [
  'In Progress',
  'Pending',
  'Action Required',
  'Approved',
  'Rejected',
  'Returned'
];
const SLA_TIERS: SlaTier[] = ['On Track', 'Approaching', 'Due Today', 'Breached', 'Paused'];

function invalid(field: string, expectation: string): never {
  throw new HttpError(400, 'INVALID_BODY', `${field} ${expectation}`);
}

function oneOf<T extends string>(
  body: Body,
  field: string,
  allowed: readonly T[],
  optional: false
): T;
function oneOf<T extends string>(
  body: Body,
  field: string,
  allowed: readonly T[],
  optional: true
): T | undefined;
function oneOf<T extends string>(
  body: Body,
  field: string,
  allowed: readonly T[],
  optional: boolean
): T | undefined;
function oneOf<T extends string>(
  body: Body,
  field: string,
  allowed: readonly T[],
  optional: boolean
): T | undefined {
  const value = body[field];
  if (value === undefined || value === null || value === '') {
    if (optional) return undefined;
    invalid(field, 'is required.');
  }
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    invalid(field, `must be one of: ${allowed.join(', ')}.`);
  }
  return value as T;
}

export function requireNumber(body: Body, field: string, min = 0, max = 1_000_000_000): number {
  const value = body[field];
  if (typeof value !== 'number' || !Number.isInteger(value)) invalid(field, 'must be an integer.');
  if (value < min || value > max) invalid(field, `must be between ${min} and ${max}.`);
  return value;
}

export function optionalNumber(
  body: Body,
  field: string,
  min = 0,
  max = 1_000_000_000
): number | undefined {
  if (body[field] === undefined || body[field] === null) return undefined;
  return requireNumber(body, field, min, max);
}

export function requireBoolean(body: Body, field: string): boolean {
  const value = body[field];
  if (typeof value !== 'boolean') invalid(field, 'must be a boolean.');
  return value;
}

export function optionalBoolean(body: Body, field: string): boolean | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') invalid(field, 'must be a boolean.');
  return value;
}

export function optionalStringList(body: Body, field: string): string[] | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    invalid(field, 'must be an array of strings.');
  }
  return value as string[];
}

export function optionalNumberList(body: Body, field: string, min = 0, max = 365): number[] | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) invalid(field, 'must be an array of numbers.');
  for (const item of value) {
    if (typeof item !== 'number' || !Number.isInteger(item) || item < min || item > max) {
      invalid(field, `must contain integers between ${min} and ${max}.`);
    }
  }
  return value as number[];
}

export function requireJsonArray<T>(body: Body, field: string): T[] {
  const value = body[field];
  if (!Array.isArray(value)) invalid(field, 'must be an array.');
  return value as T[];
}

export function optionalJsonArray<T>(body: Body, field: string): T[] | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) invalid(field, 'must be an array.');
  return value as T[];
}

export function optionalJsonObject<T>(body: Body, field: string): T | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) invalid(field, 'must be an object.');
  return value as T;
}

export function requireRegion(body: Body, field = 'region'): Region {
  return oneOf(body, field, REGIONS, false);
}

export function applicationStage(body: Body, optional: false): ApplicationStage;
export function applicationStage(body: Body, optional: true): ApplicationStage | undefined;
export function applicationStage(body: Body, optional: boolean): ApplicationStage | undefined {
  return oneOf(body, 'stage', STAGES, optional);
}

export function applicationStatus(body: Body, optional: false): ApplicationStatus;
export function applicationStatus(body: Body, optional: true): ApplicationStatus | undefined;
export function applicationStatus(body: Body, optional: boolean): ApplicationStatus | undefined {
  return oneOf(body, 'status', APPLICATION_STATUSES, optional);
}

export function parseApplication(body: Body): Application {
  const region = requireRegion(body);
  return {
    id: requireString(body.id, 'id', { max: 200 }),
    instituteId: requireString(body.instituteId, 'instituteId', { max: 200 }),
    instituteName: requireString(body.instituteName, 'instituteName'),
    type: requireString(body.type, 'type', { max: 200 }),
    region,
    state: requireString(body.state, 'state', { max: 200 }),
    stage: applicationStage(body, false),
    status: applicationStatus(body, false),
    lastUpdated: requireString(body.lastUpdated, 'lastUpdated', { max: 100 }),
    appliedDate: requireString(body.appliedDate, 'appliedDate', { max: 100 }),
    category: requireString(body.category, 'category', { max: 200 }),
    intakeProposed: requireNumber(body, 'intakeProposed'),
    programs: optionalStringList(body, 'programs') ?? [],
    contactEmail: requireString(body.contactEmail, 'contactEmail', { max: 320 }),
    contactPhone: requireString(body.contactPhone, 'contactPhone', { max: 40 }),
    timeline: requireJsonArray<Application['timeline'][number]>(body, 'timeline'),
    documents: requireJsonArray<Application['documents'][number]>(body, 'documents'),
    remarks: optionalString(body.remarks, 'remarks'),
    routeId: optionalString(body.routeId, 'routeId', 100) as Application['routeId'],
    stageEnteredAt: optionalString(body.stageEnteredAt, 'stageEnteredAt', 100),
    stageDueAt: optionalString(body.stageDueAt, 'stageDueAt', 100),
    slaTier: oneOf(body, 'slaTier', SLA_TIERS, true),
    assignedOfficerId: optionalString(body.assignedOfficerId, 'assignedOfficerId', 200),
    deficiencies: optionalJsonArray<NonNullable<Application['deficiencies']>[number]>(body, 'deficiencies'),
    returns: optionalJsonArray<NonNullable<Application['returns']>[number]>(body, 'returns'),
    decision: optionalJsonObject<NonNullable<Application['decision']>>(body, 'decision'),
    caseSummary: optionalString(body.caseSummary, 'caseSummary', 5000),
    evcVisitId: optionalString(body.evcVisitId, 'evcVisitId', 200),
    version: optionalNumber(body, 'version', 1) ?? 1,
    lastActionBy: optionalString(body.lastActionBy, 'lastActionBy', 200)
  };
}

export function parseEVCVisit(body: Body): EVCVisit {
  const displayDate = optionalJsonObject<{ day?: unknown; month?: unknown }>(body, 'displayDate');
  const day = typeof displayDate?.day === 'string' ? displayDate.day : '';
  const month = typeof displayDate?.month === 'string' ? displayDate.month : '';

  return {
    id: requireString(body.id, 'id', { max: 200 }),
    applicationId: optionalString(body.applicationId, 'applicationId', 200),
    instituteId: requireString(body.instituteId, 'instituteId', { max: 200 }),
    instituteName: requireString(body.instituteName, 'instituteName'),
    stateRegion: requireString(body.stateRegion, 'stateRegion', { max: 200 }),
    region: requireRegion(body),
    date: requireString(body.date, 'date', { max: 100 }),
    displayDate: { day, month },
    status: oneOf(body, 'status', ['Scheduled', 'Pending', 'Completed', 'Cancelled'] as const, false),
    assignedCommittee: requireString(body.assignedCommittee, 'assignedCommittee'),
    committeeMembers: optionalStringList(body, 'committeeMembers') ?? [],
    mode: oneOf(body, 'mode', ['Physical', 'Hybrid', 'Virtual'] as const, false),
    reportSubmitted: optionalBoolean(body, 'reportSubmitted'),
    scheduledAt: optionalString(body.scheduledAt, 'scheduledAt', 100),
    reportDueAt: optionalString(body.reportDueAt, 'reportDueAt', 100),
    reportSubmittedAt: optionalString(body.reportSubmittedAt, 'reportSubmittedAt', 100),
    slaTier: oneOf(body, 'slaTier', SLA_TIERS, true),
    escalationLevel: optionalNumber(body, 'escalationLevel'),
    report: optionalJsonObject<NonNullable<EVCVisit['report']>>(body, 'report'),
    checklist: optionalJsonArray<NonNullable<EVCVisit['checklist']>[number]>(body, 'checklist'),
    evidenceFiles: optionalStringList(body, 'evidenceFiles') ?? []
  };
}

export function parseComplianceRecord(body: Body): ComplianceRecord {
  return {
    id: requireString(body.id, 'id', { max: 200 }),
    title: requireString(body.title, 'title'),
    category: oneOf(
      body,
      'category',
      ['Lease Documents', 'Institutional Undertakings', 'Compliance Submissions', 'Expired Documents', 'Valid Documents'] as const,
      false
    ),
    instituteName: requireString(body.instituteName, 'instituteName'),
    instituteId: requireString(body.instituteId, 'instituteId', { max: 200 }),
    region: requireRegion(body),
    status: oneOf(body, 'status', ['Pending', 'Submitted', 'Verified', 'Expired', 'Critical'] as const, false),
    dueDate: requireString(body.dueDate, 'dueDate', { max: 100 }),
    submissionDate: optionalString(body.submissionDate, 'submissionDate', 100),
    documentRef: optionalString(body.documentRef, 'documentRef', 200),
    urgency: oneOf(body, 'urgency', ['high', 'medium', 'low'] as const, false),
    undertakingId: optionalString(body.undertakingId, 'undertakingId', 200),
    escalationLevel: optionalNumber(body, 'escalationLevel')
  };
}

export function parseDocumentItem(body: Body): DocumentItem {
  return {
    id: requireString(body.id, 'id', { max: 200 }),
    title: requireString(body.title, 'title'),
    category: oneOf(
      body,
      'category',
      ['Land & Building', 'Fire Safety', 'AICTE Approvals', 'Affiliation', 'Audit & Finance'] as const,
      false
    ),
    instituteName: requireString(body.instituteName, 'instituteName'),
    instituteId: requireString(body.instituteId, 'instituteId', { max: 200 }),
    region: requireRegion(body),
    uploadDate: requireString(body.uploadDate, 'uploadDate', { max: 100 }),
    expiryDate: requireString(body.expiryDate, 'expiryDate', { max: 100 }),
    status: oneOf(body, 'status', ['Verified', 'Pending', 'Expired', 'Rejected', 'Superseded'] as const, false),
    fileSize: requireString(body.fileSize, 'fileSize', { min: 0, max: 100 }),
    fileType: requireString(body.fileType, 'fileType', { min: 0, max: 100 }),
    documentTypeCode: optionalString(body.documentTypeCode, 'documentTypeCode', 100),
    renewalOfId: optionalString(body.renewalOfId, 'renewalOfId', 200),
    renewalStatus: oneOf(
      body,
      'renewalStatus',
      ['Requested', 'Submitted', 'Verified', 'Rejected'] as const,
      true
    ),
    renewalNote: optionalString(body.renewalNote, 'renewalNote', 2000),
    storagePath: optionalString(body.storagePath, 'storagePath', 500),
    expiryTier: optionalString(body.expiryTier, 'expiryTier', 100)
  };
}

export function parseUndertaking(body: Body): Undertaking {
  return {
    id: requireString(body.id, 'id', { max: 200 }),
    applicationId: requireString(body.applicationId, 'applicationId', { max: 200 }),
    instituteId: requireString(body.instituteId, 'instituteId', { max: 200 }),
    instituteName: requireString(body.instituteName, 'instituteName'),
    region: requireRegion(body),
    conditionCode: requireString(body.conditionCode, 'conditionCode', { max: 200 }),
    title: requireString(body.title, 'title'),
    dueDate: requireString(body.dueDate, 'dueDate', { max: 100 }),
    evidenceDocumentIds: optionalStringList(body, 'evidenceDocumentIds') ?? [],
    submittedAt: optionalString(body.submittedAt, 'submittedAt', 100),
    rejectionReason: optionalString(body.rejectionReason, 'rejectionReason', 2000),
    status: oneOf(
      body,
      'status',
      ['Pending', 'Submitted', 'Verified', 'Rejected', 'Overdue', 'Escalated'] as const,
      false
    ),
    escalationLevel: optionalNumber(body, 'escalationLevel') ?? 0
  };
}

export function parseNotification(body: Body): NotificationItem {
  return {
    id: requireString(body.id, 'id', { max: 200 }),
    title: requireString(body.title, 'title'),
    description: requireString(body.description, 'description', { max: 5000 }),
    category: oneOf(body, 'category', ['application', 'evc', 'compliance', 'system'] as const, false),
    timestamp: requireString(body.timestamp, 'timestamp', { max: 100 }),
    read: optionalBoolean(body, 'read') ?? false,
    priority: oneOf(body, 'priority', ['high', 'medium', 'low'] as const, false),
    link: optionalString(body.link, 'link', 500),
    targetRole: optionalString(body.targetRole, 'targetRole', 50) as NotificationItem['targetRole'],
    targetRegion: oneOf(body, 'targetRegion', REGIONS, true),
    targetInstituteId: optionalString(body.targetInstituteId, 'targetInstituteId', 200),
    targetUserId: optionalString(body.targetUserId, 'targetUserId', 200),
    dedupeKey: optionalString(body.dedupeKey, 'dedupeKey', 500),
    eventType: optionalString(body.eventType, 'eventType', 100)
  };
}

export function parseSystemAlert(body: Body): SystemAlert {
  return {
    id: requireString(body.id, 'id', { max: 200 }),
    rule: requireString(body.rule, 'rule', { max: 200 }),
    entityType: oneOf(body, 'entityType', ['Application', 'EVC', 'Undertaking', 'Document'] as const, false),
    entityId: requireString(body.entityId, 'entityId', { max: 200 }),
    tier: requireString(body.tier, 'tier', { max: 100 }),
    severity: oneOf(body, 'severity', ['low', 'medium', 'high', 'critical'] as const, false),
    dedupeKey: requireString(body.dedupeKey, 'dedupeKey', { max: 500 }),
    createdAt: requireString(body.createdAt, 'createdAt', { max: 100 }),
    status: oneOf(body, 'status', ['Open', 'Acknowledged', 'Resolved'] as const, false),
    title: requireString(body.title, 'title'),
    description: requireString(body.description, 'description', { max: 5000 }),
    link: optionalString(body.link, 'link', 500),
    region: oneOf(body, 'region', REGIONS, true),
    instituteId: optionalString(body.instituteId, 'instituteId', 200),
    targetRoles: optionalStringList(body, 'targetRoles') as SystemAlert['targetRoles']
  };
}

export function parseEscalation(body: Body): EscalationItem {
  return {
    id: requireString(body.id, 'id', { max: 200 }),
    applicationId: requireString(body.applicationId, 'applicationId', { max: 200 }),
    instituteName: requireString(body.instituteName, 'instituteName'),
    region: requireRegion(body),
    raisedBy: requireString(body.raisedBy, 'raisedBy'),
    raisedDate: requireString(body.raisedDate, 'raisedDate', { max: 100 }),
    urgency: oneOf(body, 'urgency', ['Medium', 'High', 'Critical'] as const, false),
    reason: requireString(body.reason, 'reason', { max: 5000 }),
    status: oneOf(body, 'status', ['Open', 'Under Review', 'Resolved'] as const, false),
    level: optionalNumber(body, 'level'),
    slaBreachDays: optionalNumber(body, 'slaBreachDays'),
    dedupeKey: optionalString(body.dedupeKey, 'dedupeKey', 500),
    entityType: oneOf(body, 'entityType', ['Application', 'EVC', 'Undertaking', 'Document'] as const, true),
    entityId: optionalString(body.entityId, 'entityId', 200),
    acknowledgedBy: optionalString(body.acknowledgedBy, 'acknowledgedBy', 200),
    acknowledgedAt: optionalString(body.acknowledgedAt, 'acknowledgedAt', 100),
    resolvedAt: optionalString(body.resolvedAt, 'resolvedAt', 100)
  };
}

export function parseSystemConfig(body: Body): SystemConfig {
  return {
    maintenanceMode: requireBoolean(body, 'maintenanceMode'),
    academicYear: requireString(body.academicYear, 'academicYear', { max: 20 }),
    approvalCycleEndDate: requireString(body.approvalCycleEndDate, 'approvalCycleEndDate', { max: 100 }),
    evcMinMembers: requireNumber(body, 'evcMinMembers', 1, 50),
    autoEscalationDays: requireNumber(body, 'autoEscalationDays', 1, 365),
    notificationEmailAlerts: requireBoolean(body, 'notificationEmailAlerts'),
    requireTwoFactorForAdmin: requireBoolean(body, 'requireTwoFactorForAdmin'),
    maxUploadSizeMB: requireNumber(body, 'maxUploadSizeMB', 1, 200),
    stageSlas: optionalJsonObject<NonNullable<SystemConfig['stageSlas']>>(body, 'stageSlas'),
    escalationMatrix: optionalJsonArray<NonNullable<SystemConfig['escalationMatrix']>[number]>(
      body,
      'escalationMatrix'
    ),
    notificationRules: optionalJsonArray<NonNullable<SystemConfig['notificationRules']>[number]>(
      body,
      'notificationRules'
    ),
    documentWarningDays: optionalNumberList(body, 'documentWarningDays'),
    undertakingWarningDays: optionalNumberList(body, 'undertakingWarningDays'),
    businessDaysOnly: optionalBoolean(body, 'businessDaysOnly')
  };
}

const TRANSITION_ACTIONS: TransitionAction[] = [
  'FORWARD',
  'RETURN',
  'REVERT',
  'APPROVE',
  'REJECT',
  'RESUBMIT'
];

export interface TransitionDraft {
  action: TransitionAction;
  toStage?: ApplicationStage;
  reasonCode?: string;
  note?: string;
  expectedVersion?: number;
  overrideUndertaking?: boolean;
}

export function parseTransition(body: Body): TransitionDraft {
  return {
    action: oneOf(body, 'action', TRANSITION_ACTIONS, false),
    toStage: oneOf(body, 'toStage', STAGES, true),
    reasonCode: optionalString(body.reasonCode, 'reasonCode', 60),
    note: optionalString(body.note, 'note', 2000),
    expectedVersion: optionalNumber(body, 'expectedVersion', 1, 1_000_000),
    overrideUndertaking: optionalBoolean(body, 'overrideUndertaking')
  };
}
