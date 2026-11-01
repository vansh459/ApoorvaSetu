import type {
  Application as ApplicationRow,
  ComplianceRecord as ComplianceRow,
  DocumentItem as DocumentRow,
  EVCVisit as EVCVisitRow,
  Institute as InstituteRow,
  Undertaking as UndertakingRow
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  Application,
  ApplicationDecision,
  ApplicationTimelineEvent,
  ComplianceRecord,
  Deficiency,
  DocumentItem,
  EVCVisit,
  EVCVisitChecklistItem,
  Institute,
  InspectionReport,
  ReturnRecord,
  Undertaking
} from '../../src/types/index.ts';
import { asArray, asObject, asOptionalArray, jsonOptional, jsonRequired, optional } from './json.ts';

type ApplicationDocument = Application['documents'][number];

export function toApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    instituteId: row.instituteId,
    instituteName: row.instituteName,
    type: row.type,
    region: row.region as Application['region'],
    state: row.state,
    stage: row.stage as Application['stage'],
    status: row.status as Application['status'],
    lastUpdated: row.lastUpdated,
    appliedDate: row.appliedDate,
    category: row.category,
    intakeProposed: row.intakeProposed,
    programs: row.programs,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    timeline: asArray<ApplicationTimelineEvent>(row.timeline),
    documents: asArray<ApplicationDocument>(row.documents),
    remarks: optional(row.remarks),
    routeId: (row.routeId ?? undefined) as Application['routeId'],
    stageEnteredAt: optional(row.stageEnteredAt),
    stageDueAt: optional(row.stageDueAt),
    slaTier: (row.slaTier ?? undefined) as Application['slaTier'],
    assignedOfficerId: optional(row.assignedOfficerId),
    deficiencies: asOptionalArray<Deficiency>(row.deficiencies),
    returns: asOptionalArray<ReturnRecord>(row.returns),
    decision: asObject<ApplicationDecision>(row.decision),
    caseSummary: optional(row.caseSummary),
    evcVisitId: optional(row.evcVisitId),
    version: row.version,
    lastActionBy: optional(row.lastActionBy)
  };
}

export function toApplicationData(app: Application): Prisma.ApplicationUncheckedCreateInput {
  return {
    id: app.id,
    instituteId: app.instituteId,
    instituteName: app.instituteName,
    type: app.type,
    region: app.region,
    state: app.state,
    stage: app.stage,
    status: app.status,
    lastUpdated: app.lastUpdated,
    appliedDate: app.appliedDate,
    category: app.category,
    intakeProposed: app.intakeProposed,
    programs: app.programs,
    contactEmail: app.contactEmail,
    contactPhone: app.contactPhone,
    timeline: jsonRequired(app.timeline),
    documents: jsonRequired(app.documents),
    remarks: app.remarks ?? null,
    routeId: app.routeId ?? null,
    stageEnteredAt: app.stageEnteredAt ?? null,
    stageDueAt: app.stageDueAt ?? null,
    slaTier: app.slaTier ?? null,
    assignedOfficerId: app.assignedOfficerId ?? null,
    deficiencies: jsonOptional(app.deficiencies),
    returns: jsonOptional(app.returns),
    decision: jsonOptional(app.decision),
    caseSummary: app.caseSummary ?? null,
    evcVisitId: app.evcVisitId ?? null,
    version: app.version ?? 1,
    lastActionBy: app.lastActionBy ?? null
  };
}

export function toInstitute(row: InstituteRow): Institute {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    region: row.region as Institute['region'],
    state: row.state,
    city: row.city,
    category: row.category as Institute['category'],
    establishedYear: row.establishedYear,
    principalName: row.principalName,
    email: row.email,
    phone: row.phone,
    address: row.address,
    status: row.status as Institute['status'],
    approvedSeats: row.approvedSeats,
    accreditedPrograms: row.accreditedPrograms,
    complianceScore: row.complianceScore,
    activeApplicationsCount: row.activeApplicationsCount
  };
}

export function toInstituteData(institute: Institute): Prisma.InstituteUncheckedCreateInput {
  return { ...institute };
}

export function toEVCVisit(row: EVCVisitRow): EVCVisit {
  return {
    id: row.id,
    applicationId: optional(row.applicationId),
    instituteId: row.instituteId,
    instituteName: row.instituteName,
    stateRegion: row.stateRegion,
    region: row.region as EVCVisit['region'],
    date: row.date,
    displayDate: asObject<EVCVisit['displayDate']>(row.displayDate) ?? { day: '', month: '' },
    status: row.status as EVCVisit['status'],
    assignedCommittee: row.assignedCommittee,
    committeeMembers: row.committeeMembers,
    mode: row.mode as EVCVisit['mode'],
    reportSubmitted: optional(row.reportSubmitted),
    scheduledAt: optional(row.scheduledAt),
    reportDueAt: optional(row.reportDueAt),
    reportSubmittedAt: optional(row.reportSubmittedAt),
    slaTier: (row.slaTier ?? undefined) as EVCVisit['slaTier'],
    escalationLevel: optional(row.escalationLevel),
    report: asObject<InspectionReport>(row.report),
    checklist: asOptionalArray<EVCVisitChecklistItem>(row.checklist),
    evidenceFiles: row.evidenceFiles.length ? row.evidenceFiles : undefined
  };
}

export function toEVCVisitData(visit: EVCVisit): Prisma.EVCVisitUncheckedCreateInput {
  return {
    id: visit.id,
    applicationId: visit.applicationId ?? null,
    instituteId: visit.instituteId,
    instituteName: visit.instituteName,
    stateRegion: visit.stateRegion,
    region: visit.region,
    date: visit.date,
    displayDate: jsonRequired(visit.displayDate),
    status: visit.status,
    assignedCommittee: visit.assignedCommittee,
    committeeMembers: visit.committeeMembers,
    mode: visit.mode,
    reportSubmitted: visit.reportSubmitted ?? null,
    scheduledAt: visit.scheduledAt ?? null,
    reportDueAt: visit.reportDueAt ?? null,
    reportSubmittedAt: visit.reportSubmittedAt ?? null,
    slaTier: visit.slaTier ?? null,
    escalationLevel: visit.escalationLevel ?? null,
    report: jsonOptional(visit.report),
    checklist: jsonOptional(visit.checklist),
    evidenceFiles: visit.evidenceFiles ?? []
  };
}

export function toComplianceRecord(row: ComplianceRow): ComplianceRecord {
  return {
    id: row.id,
    title: row.title,
    category: row.category as ComplianceRecord['category'],
    instituteName: row.instituteName,
    instituteId: row.instituteId,
    region: row.region as ComplianceRecord['region'],
    status: row.status as ComplianceRecord['status'],
    dueDate: row.dueDate,
    submissionDate: optional(row.submissionDate),
    documentRef: optional(row.documentRef),
    urgency: row.urgency as ComplianceRecord['urgency'],
    undertakingId: optional(row.undertakingId),
    verifiedAt: optional(row.verifiedAt),
    verifiedBy: optional(row.verifiedBy),
    escalationLevel: optional(row.escalationLevel)
  };
}

export function toComplianceRecordData(
  record: ComplianceRecord
): Prisma.ComplianceRecordUncheckedCreateInput {
  return {
    id: record.id,
    title: record.title,
    category: record.category,
    instituteName: record.instituteName,
    instituteId: record.instituteId,
    region: record.region,
    status: record.status,
    dueDate: record.dueDate,
    submissionDate: record.submissionDate ?? null,
    documentRef: record.documentRef ?? null,
    urgency: record.urgency,
    undertakingId: record.undertakingId ?? null,
    verifiedAt: record.verifiedAt ?? null,
    verifiedBy: record.verifiedBy ?? null,
    escalationLevel: record.escalationLevel ?? null
  };
}

export function toDocumentItem(row: DocumentRow): DocumentItem {
  return {
    id: row.id,
    title: row.title,
    category: row.category as DocumentItem['category'],
    instituteName: row.instituteName,
    instituteId: row.instituteId,
    region: row.region as DocumentItem['region'],
    uploadDate: row.uploadDate,
    expiryDate: row.expiryDate,
    status: row.status as DocumentItem['status'],
    fileSize: row.fileSize,
    fileType: row.fileType,
    documentTypeCode: optional(row.documentTypeCode),
    renewalOfId: optional(row.renewalOfId),
    renewalStatus: (row.renewalStatus ?? undefined) as DocumentItem['renewalStatus'],
    renewalNote: optional(row.renewalNote),
    verifiedBy: optional(row.verifiedBy),
    storagePath: optional(row.storagePath),
    expiryTier: optional(row.expiryTier)
  };
}

export function toDocumentItemData(document: DocumentItem): Prisma.DocumentItemUncheckedCreateInput {
  return {
    id: document.id,
    title: document.title,
    category: document.category,
    instituteName: document.instituteName,
    instituteId: document.instituteId,
    region: document.region,
    uploadDate: document.uploadDate,
    expiryDate: document.expiryDate,
    status: document.status,
    fileSize: document.fileSize,
    fileType: document.fileType,
    documentTypeCode: document.documentTypeCode ?? null,
    renewalOfId: document.renewalOfId ?? null,
    renewalStatus: document.renewalStatus ?? null,
    renewalNote: document.renewalNote ?? null,
    verifiedBy: document.verifiedBy ?? null,
    storagePath: document.storagePath ?? null,
    expiryTier: document.expiryTier ?? null
  };
}

export function toUndertaking(row: UndertakingRow): Undertaking {
  return {
    id: row.id,
    applicationId: row.applicationId,
    instituteId: row.instituteId,
    instituteName: row.instituteName,
    region: row.region as Undertaking['region'],
    conditionCode: row.conditionCode,
    title: row.title,
    dueDate: row.dueDate,
    evidenceDocumentIds: row.evidenceDocumentIds,
    submittedAt: optional(row.submittedAt),
    submittedBy: optional(row.submittedBy),
    verifiedAt: optional(row.verifiedAt),
    verifiedBy: optional(row.verifiedBy),
    rejectionReason: optional(row.rejectionReason),
    status: row.status as Undertaking['status'],
    escalationLevel: row.escalationLevel
  };
}

export function toUndertakingData(undertaking: Undertaking): Prisma.UndertakingUncheckedCreateInput {
  return {
    id: undertaking.id,
    applicationId: undertaking.applicationId,
    instituteId: undertaking.instituteId,
    instituteName: undertaking.instituteName,
    region: undertaking.region,
    conditionCode: undertaking.conditionCode,
    title: undertaking.title,
    dueDate: undertaking.dueDate,
    evidenceDocumentIds: undertaking.evidenceDocumentIds,
    submittedAt: undertaking.submittedAt ?? null,
    submittedBy: undertaking.submittedBy ?? null,
    verifiedAt: undertaking.verifiedAt ?? null,
    verifiedBy: undertaking.verifiedBy ?? null,
    rejectionReason: undertaking.rejectionReason ?? null,
    status: undertaking.status,
    escalationLevel: undertaking.escalationLevel
  };
}
