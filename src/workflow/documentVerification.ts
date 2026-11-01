import type {
  Application,
  DocumentAISummary,
  DocumentChecklistRow,
  DocumentExtraction,
  DocumentItem,
  DocumentVerificationIssue,
  DocumentVerificationReport,
  RouteId,
  VerificationField
} from '../types';
import { addMonths, differenceInCalendarDays, getNow, parseDate, toIsoDate } from '../utils/dates';
import { documentValidity, getDocumentType, inferDocumentType, isActiveDocument } from './documents';
import { routeForApplication } from './routes';

export const AI_ASSISTED_DISCLAIMER =
  'AI-assisted verification only. This report does not approve, reject, or otherwise decide the application. Final statutory decisions remain with the competent AICTE authority.';

export interface ChecklistRequirement {
  codes: string[];
  label: string;
  mandatory: boolean;
}

export const CHECKLIST_BY_ROUTE: Record<RouteId, ChecklistRequirement[]> = {
  ROUTE_EVC_SAC: [
    { codes: ['LAND_LEASE_DEED', 'LAND_OWNERSHIP_DEED'], label: 'Registered land lease deed or ownership deed', mandatory: true },
    { codes: ['BUILDING_STABILITY'], label: 'Building stability certificate', mandatory: true },
    { codes: ['FIRE_SAFETY_NOC'], label: 'Fire safety NOC', mandatory: true },
    { codes: ['UNIVERSITY_AFFILIATION'], label: 'University affiliation', mandatory: true },
    { codes: ['AUDITED_FINANCIALS'], label: 'Audited financial statements', mandatory: true },
    { codes: ['BARRIER_FREE_AFFIDAVIT'], label: 'Barrier-free environment affidavit', mandatory: true },
    { codes: ['FACULTY_DECLARATION'], label: 'Faculty cadre ratio declaration', mandatory: true }
  ],
  ROUTE_SCRUTINY_EVC: [
    { codes: ['AICTE_APPROVAL_LETTER'], label: 'AICTE approval letter', mandatory: true },
    { codes: ['FIRE_SAFETY_NOC'], label: 'Fire safety NOC', mandatory: true },
    { codes: ['UNIVERSITY_AFFILIATION'], label: 'University affiliation', mandatory: true },
    { codes: ['AUDITED_FINANCIALS'], label: 'Audited financial statements', mandatory: true },
    { codes: ['BARRIER_FREE_AFFIDAVIT'], label: 'Barrier-free environment affidavit', mandatory: true },
    { codes: ['FACULTY_DECLARATION'], label: 'Faculty cadre ratio declaration', mandatory: true }
  ],
  ROUTE_SCRUTINY_ONLY: [
    { codes: ['AICTE_APPROVAL_LETTER'], label: 'AICTE approval letter', mandatory: true },
    { codes: ['AUDITED_FINANCIALS'], label: 'Audited financial statements', mandatory: true },
    { codes: ['FACULTY_DECLARATION'], label: 'Faculty cadre ratio declaration', mandatory: true }
  ],
  ROUTE_EVC_ONLY: [
    { codes: ['AICTE_APPROVAL_LETTER'], label: 'AICTE approval letter', mandatory: true },
    { codes: ['AUDITED_FINANCIALS'], label: 'Audited financial statements', mandatory: true }
  ],
  ROUTE_SCRUTINY_SAC: [
    { codes: ['AICTE_APPROVAL_LETTER'], label: 'AICTE approval letter', mandatory: true },
    { codes: ['FACULTY_DECLARATION'], label: 'Faculty cadre ratio declaration', mandatory: true },
    { codes: ['AUDITED_FINANCIALS'], label: 'Audited financial statements', mandatory: true }
  ],
  ROUTE_SAC_APPEAL: [
    { codes: ['AICTE_APPROVAL_LETTER'], label: 'AICTE approval letter', mandatory: true }
  ]
};

const REGISTRATION_REQUIRED = new Set([
  'LAND_LEASE_DEED',
  'LAND_OWNERSHIP_DEED',
  'UNIVERSITY_AFFILIATION',
  'AICTE_APPROVAL_LETTER'
]);

const ISSUING_AUTHORITY_REQUIRED = new Set([
  'LAND_LEASE_DEED',
  'LAND_OWNERSHIP_DEED',
  'FIRE_SAFETY_NOC',
  'UNIVERSITY_AFFILIATION',
  'AICTE_APPROVAL_LETTER'
]);

const ISSUE_DATE_REQUIRED = new Set([
  'LAND_LEASE_DEED',
  'LAND_OWNERSHIP_DEED',
  'BUILDING_STABILITY',
  'FIRE_SAFETY_NOC',
  'UNIVERSITY_AFFILIATION',
  'AICTE_APPROVAL_LETTER',
  'AUDITED_FINANCIALS'
]);

const GENERIC_NAME_TOKENS = new Set(['the', 'of', 'and', 'for', 'at', 'in', 'a', 'an', 'pvt', 'private', 'ltd', 'limited']);

export function requiredChecklistForApplication(
  application: Pick<Application, 'type' | 'routeId'>
): ChecklistRequirement[] {
  return CHECKLIST_BY_ROUTE[routeForApplication(application).id] ?? [];
}

export function documentTypeCodeOf(document: DocumentItem): string | undefined {
  if (document.documentTypeCode) return document.documentTypeCode;
  return inferDocumentType(document)?.code;
}

function hasValue(field: VerificationField | undefined): boolean {
  return Boolean(field?.value && field.value.trim());
}

function nameTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !GENERIC_NAME_TOKENS.has(token));
}

export function institutionNameSimilarity(left: string, right: string): number {
  const leftTokens = new Set(nameTokens(left));
  const rightTokens = new Set(nameTokens(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  let overlap = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) overlap += 1;
  });
  return overlap / Math.min(leftTokens.size, rightTokens.size);
}

export interface ChecklistComparisonInput {
  application: Application;
  documents: DocumentItem[];
  documentTypeCode: string;
  warningDays: number[];
  now?: Date;
}

export function compareChecklist(input: ChecklistComparisonInput): DocumentChecklistRow[] {
  const now = input.now ?? getNow();
  const requirements = requiredChecklistForApplication(input.application);
  const scopedDocuments = input.documents.filter(
    (document) => document.instituteId === input.application.instituteId && isActiveDocument(document)
  );

  return requirements.map((requirement) => {
    const candidates = scopedDocuments.filter((document) => {
      const code = documentTypeCodeOf(document);
      return code ? requirement.codes.includes(code) : false;
    });

    const validated = candidates.map((document) => ({
      document,
      tier: documentValidity(document, input.warningDays, now).tier
    }));

    const validVerified = validated.filter(
      (entry) => entry.document.status === 'Verified' && entry.tier !== 'Expired'
    );
    const pending = validated.filter((entry) => entry.document.status === 'Pending');
    const expired = validated.filter(
      (entry) => entry.tier === 'Expired' && entry.document.status !== 'Superseded'
    );
    const rejected = validated.filter((entry) => entry.document.status === 'Rejected');
    const currentUploadMatches = requirement.codes.includes(input.documentTypeCode);
    const evidenceDocumentIds = candidates.map((document) => document.id);

    if (validVerified.length > 0) {
      return {
        code: requirement.codes.join('/'),
        label: requirement.label,
        mandatory: requirement.mandatory,
        status: 'Present',
        evidenceDocumentIds: validVerified.map((entry) => entry.document.id)
      };
    }

    if (currentUploadMatches || pending.length > 0) {
      return {
        code: requirement.codes.join('/'),
        label: requirement.label,
        mandatory: requirement.mandatory,
        status: 'Pending Verification',
        evidenceDocumentIds: currentUploadMatches ? [...evidenceDocumentIds, 'CURRENT_UPLOAD'] : evidenceDocumentIds
      };
    }

    if (expired.length > 0) {
      return {
        code: requirement.codes.join('/'),
        label: requirement.label,
        mandatory: requirement.mandatory,
        status: 'Expired',
        evidenceDocumentIds: expired.map((entry) => entry.document.id)
      };
    }

    if (rejected.length > 0) {
      return {
        code: requirement.codes.join('/'),
        label: requirement.label,
        mandatory: requirement.mandatory,
        status: 'Rejected',
        evidenceDocumentIds: rejected.map((entry) => entry.document.id)
      };
    }

    return {
      code: requirement.codes.join('/'),
      label: requirement.label,
      mandatory: requirement.mandatory,
      status: 'Missing',
      evidenceDocumentIds: []
    };
  });
}

export interface VerificationEvaluationInput {
  application: Application;
  documents: DocumentItem[];
  documentTypeCode: string;
  extraction: DocumentExtraction;
  fileName: string;
  fileHash: string;
  warningDays: number[];
  now?: Date;
  existingReports?: DocumentVerificationReport[];
}

export interface VerificationEvaluation {
  issues: DocumentVerificationIssue[];
  checklist: DocumentChecklistRow[];
}

function fieldIssue(
  issues: DocumentVerificationIssue[],
  field: string,
  message: string,
  severity: DocumentVerificationIssue['severity'] = 'warning'
): void {
  issues.push({ code: 'MISSING_FIELD', severity, field, message });
}

export function evaluateDocumentVerification(input: VerificationEvaluationInput): VerificationEvaluation {
  const now = input.now ?? getNow();
  const type = getDocumentType(input.documentTypeCode);
  const fields = input.extraction.fields;
  const issues: DocumentVerificationIssue[] = [];

  if (!hasValue(fields.institutionName)) {
    fieldIssue(issues, 'institutionName', 'The institution name could not be identified in the document.', 'critical');
  }
  if (!hasValue(fields.documentType)) {
    fieldIssue(issues, 'documentType', 'The document type could not be identified from its content.', 'warning');
  }
  if (!hasValue(fields.issueDate) && (type ? ISSUE_DATE_REQUIRED.has(type.code) : true)) {
    fieldIssue(issues, 'issueDate', 'The issue date is missing or could not be read.', 'warning');
  }
  if (!hasValue(fields.expiryDate) && (type?.validityMonths ?? 0) > 0) {
    fieldIssue(issues, 'expiryDate', 'The expiry date is missing, so validity cannot be confirmed.', 'critical');
  }
  if (!hasValue(fields.registrationNumber) && type && REGISTRATION_REQUIRED.has(type.code)) {
    fieldIssue(issues, 'registrationNumber', 'Registration details are missing for a document that normally carries them.', 'warning');
  }
  if (!hasValue(fields.issuingAuthority) && type && ISSUING_AUTHORITY_REQUIRED.has(type.code)) {
    fieldIssue(issues, 'issuingAuthority', 'The issuing authority could not be identified.', 'warning');
  }

  (Object.keys(fields) as (keyof typeof fields)[]).forEach((key) => {
    const field = fields[key];
    if (field?.value && field.confidence === 'low') {
      issues.push({
        code: 'LOW_CONFIDENCE',
        severity: 'warning',
        field: key,
        message: `Low-confidence reading for ${key}; a human should confirm this value.`
      });
    }
  });

  const issueDate = parseDate(fields.issueDate.value ?? undefined);
  const expiryDate = parseDate(fields.expiryDate.value ?? undefined);

  if (fields.expiryDate.value && !expiryDate) {
    issues.push({
      code: 'MISSING_FIELD',
      severity: 'warning',
      field: 'expiryDate',
      message: `The expiry date "${fields.expiryDate.value}" could not be parsed.`
    });
  }

  if (issueDate && expiryDate && expiryDate < issueDate) {
    issues.push({
      code: 'DATE_ORDER_INVALID',
      severity: 'critical',
      field: 'expiryDate',
      message: 'The expiry date falls before the issue date.'
    });
  }

  if (expiryDate) {
    const validity = documentValidity(
      { expiryDate: toIsoDate(expiryDate) },
      input.warningDays,
      now
    );
    if (validity.tier === 'Expired') {
      issues.push({
        code: 'EXPIRED',
        severity: 'critical',
        field: 'expiryDate',
        message: `The document expired ${Math.abs(validity.daysLeft)} day(s) ago (${toIsoDate(expiryDate)}).`
      });
    } else if (validity.tier === 'Critical') {
      issues.push({
        code: 'EXPIRING_SOON',
        severity: 'warning',
        field: 'expiryDate',
        message: validity.daysLeft === 0
          ? 'The document expires today.'
          : `The document expires in ${validity.daysLeft} day(s).`
      });
    } else if (validity.tier === 'Expiring Soon') {
      issues.push({
        code: 'EXPIRING_SOON',
        severity: 'warning',
        field: 'expiryDate',
        message: `The document expires in ${validity.daysLeft} day(s).`
      });
    }
  }

  if (issueDate && expiryDate && type && type.validityMonths > 0) {
    const expected = addMonths(issueDate, type.validityMonths);
    const drift = Math.abs(differenceInCalendarDays(expected, expiryDate));
    if (drift > 60) {
      issues.push({
        code: 'VALIDITY_MISMATCH',
        severity: 'warning',
        field: 'expiryDate',
        message: `The stated validity differs from the expected ${type.validityMonths}-month window by ${drift} day(s).`
      });
    }
  }

  if (hasValue(fields.institutionName)) {
    const similarity = institutionNameSimilarity(
      fields.institutionName.value as string,
      input.application.instituteName
    );
    if (similarity < 0.6) {
      issues.push({
        code: 'INSTITUTION_MISMATCH',
        severity: 'warning',
        field: 'institutionName',
        message: `The document names "${fields.institutionName.value}", which does not closely match ${input.application.instituteName}.`
      });
    }
  }

  if (
    hasValue(fields.documentType) &&
    fields.documentType.value !== input.documentTypeCode
  ) {
    const detected = fields.documentType.value as string;
    const detectedLabel = getDocumentType(detected)?.label ?? detected;
    const selectedLabel = type?.label ?? input.documentTypeCode;
    issues.push({
      code: 'DOCUMENT_TYPE_MISMATCH',
      severity: 'warning',
      field: 'documentType',
      message: `The document looks like "${detectedLabel}" but was submitted as "${selectedLabel}".`
    });
  }

  const duplicate = input.existingReports?.find(
    (report) => report.fileHash === input.fileHash && report.status !== 'Rejected'
  );
  if (duplicate) {
    issues.push({
      code: 'DUPLICATE_FILE',
      severity: 'warning',
      message: `An identical file was already submitted as ${duplicate.id} (${duplicate.fileName}).`
    });
  }

  const checklist = compareChecklist({
    application: input.application,
    documents: input.documents,
    documentTypeCode: input.documentTypeCode,
    warningDays: input.warningDays,
    now
  });

  checklist.forEach((row) => {
    if (!row.mandatory) return;
    if (row.status === 'Missing') {
      issues.push({
        code: 'CHECKLIST_MISSING',
        severity: 'warning',
        message: `Required checklist document is missing: ${row.label}.`
      });
    } else if (row.status === 'Expired') {
      issues.push({
        code: 'CHECKLIST_EXPIRED',
        severity: 'critical',
        message: `Required checklist document is expired: ${row.label}.`,
        documentId: row.evidenceDocumentIds[0]
      });
    } else if (row.status === 'Rejected') {
      issues.push({
        code: 'CHECKLIST_REJECTED',
        severity: 'warning',
        message: `Required checklist document was rejected earlier: ${row.label}.`,
        documentId: row.evidenceDocumentIds[0]
      });
    }
  });

  return { issues, checklist };
}

export function buildDeterministicSummary(evaluation: VerificationEvaluation): string {
  const critical = evaluation.issues.filter((issue) => issue.severity === 'critical').length;
  const warnings = evaluation.issues.filter((issue) => issue.severity === 'warning').length;
  const mandatory = evaluation.checklist.filter((row) => row.mandatory);
  const present = mandatory.filter((row) => row.status === 'Present').length;
  const pending = mandatory.filter((row) => row.status === 'Pending Verification').length;
  const missing = mandatory.filter((row) => row.status === 'Missing').length;

  return [
    `${critical} critical finding(s) and ${warnings} warning(s) were identified.`,
    `${present} of ${mandatory.length} mandatory checklist documents are already verified on record.`,
    pending > 0 ? `${pending} required document(s) are awaiting officer verification.` : '',
    missing > 0 ? `${missing} required document(s) are missing.` : '',
    'This summary is advisory; an officer must review the findings.'
  ]
    .filter(Boolean)
    .join(' ');
}

export interface BuildVerificationReportInput extends VerificationEvaluationInput {
  id: string;
  createdAt: string;
  createdBy: string;
  createdByUserId: string;
  fileType: string;
  fileSize: number;
  storagePath?: string;
  aiSummary?: DocumentAISummary;
}

export function buildVerificationReport(input: BuildVerificationReportInput): DocumentVerificationReport {
  const evaluation = evaluateDocumentVerification(input);
  const aiSummary =
    input.aiSummary ??
    {
      text: buildDeterministicSummary(evaluation),
      provider: 'deterministic' as const,
      generatedAt: input.createdAt
    };

  return {
    id: input.id,
    applicationId: input.application.id,
    instituteId: input.application.instituteId,
    instituteName: input.application.instituteName,
    region: input.application.region,
    fileName: input.fileName,
    fileType: input.fileType,
    fileSize: input.fileSize,
    fileHash: input.fileHash,
    storagePath: input.storagePath,
    documentTypeCode: input.documentTypeCode,
    extraction: input.extraction,
    checklist: evaluation.checklist,
    issues: evaluation.issues,
    aiSummary,
    disclaimer: AI_ASSISTED_DISCLAIMER,
    status: 'Pending Review',
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    createdByUserId: input.createdByUserId
  };
}
