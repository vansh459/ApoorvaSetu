import type { DocumentItem } from '../types';
import { addMonths, getNow, parseDate, toIsoDate } from '../utils/dates';
import { documentExpiry, type DocumentExpiryTier } from './sla';

export type DocumentCategory = DocumentItem['category'];

export interface DocumentTypeDefinition {
  code: string;
  label: string;
  category: DocumentCategory;
  validityMonths: number;
  keywords: string[];
}

export const DOCUMENT_TYPES: DocumentTypeDefinition[] = [
  {
    code: 'LAND_LEASE_DEED',
    label: 'Registered land lease deed',
    category: 'Land & Building',
    validityMonths: 360,
    keywords: ['lease']
  },
  {
    code: 'LAND_OWNERSHIP_DEED',
    label: 'Registered land deed and possession certificate',
    category: 'Land & Building',
    validityMonths: 120,
    keywords: ['land deed', 'possession', 'title deed']
  },
  {
    code: 'BUILDING_STABILITY',
    label: 'Building stability certificate',
    category: 'Land & Building',
    validityMonths: 60,
    keywords: ['stability', 'structural']
  },
  {
    code: 'FIRE_SAFETY_NOC',
    label: 'Fire safety NOC',
    category: 'Fire Safety',
    validityMonths: 36,
    keywords: ['fire']
  },
  {
    code: 'UNIVERSITY_AFFILIATION',
    label: 'University affiliation extension',
    category: 'Affiliation',
    validityMonths: 12,
    keywords: ['affiliation']
  },
  {
    code: 'AUDITED_FINANCIALS',
    label: 'Audited balance sheet and financial statements',
    category: 'Audit & Finance',
    validityMonths: 12,
    keywords: ['balance sheet', 'financial', 'audit']
  },
  {
    code: 'BARRIER_FREE_AFFIDAVIT',
    label: 'Barrier-free environment affidavit',
    category: 'AICTE Approvals',
    validityMonths: 12,
    keywords: ['barrier', 'ramp']
  },
  {
    code: 'FACULTY_DECLARATION',
    label: 'Faculty cadre ratio declaration',
    category: 'AICTE Approvals',
    validityMonths: 12,
    keywords: ['faculty']
  },
  {
    code: 'AICTE_APPROVAL_LETTER',
    label: 'AICTE approval letter',
    category: 'AICTE Approvals',
    validityMonths: 12,
    keywords: ['approval letter', 'aicte approval']
  }
];

const CATEGORY_FALLBACK: Record<DocumentCategory, string> = {
  'Land & Building': 'LAND_OWNERSHIP_DEED',
  'Fire Safety': 'FIRE_SAFETY_NOC',
  Affiliation: 'UNIVERSITY_AFFILIATION',
  'Audit & Finance': 'AUDITED_FINANCIALS',
  'AICTE Approvals': 'AICTE_APPROVAL_LETTER'
};

export function getDocumentType(code?: string): DocumentTypeDefinition | undefined {
  if (!code) return undefined;
  return DOCUMENT_TYPES.find((type) => type.code === code);
}

export function inferDocumentType(
  document: Pick<DocumentItem, 'title' | 'category' | 'documentTypeCode'>
): DocumentTypeDefinition | undefined {
  const explicit = getDocumentType(document.documentTypeCode);
  if (explicit) return explicit;

  const title = document.title.toLowerCase();
  const match = DOCUMENT_TYPES.find((type) =>
    type.keywords.some((keyword) => title.includes(keyword))
  );
  if (match) return match;

  const fallbackCode = CATEGORY_FALLBACK[document.category];
  return getDocumentType(fallbackCode);
}

export function defaultExpiryDate(issuedOn: string, typeCode: string): string {
  const type = getDocumentType(typeCode);
  return toIsoDate(addMonths(issuedOn, type?.validityMonths ?? 12));
}

export function normalizeDocument(document: DocumentItem): DocumentItem {
  const type = inferDocumentType(document);
  const uploadDate = parseDate(document.uploadDate)
    ? toIsoDate(document.uploadDate)
    : document.uploadDate;
  const expiryDate = parseDate(document.expiryDate)
    ? toIsoDate(document.expiryDate)
    : document.expiryDate;
  return {
    ...document,
    uploadDate,
    expiryDate,
    documentTypeCode: document.documentTypeCode ?? type?.code
  };
}

export interface DocumentValidity {
  tier: DocumentExpiryTier;
  daysLeft: number;
  expiryDate: string;
}

export function documentValidity(
  document: Pick<DocumentItem, 'expiryDate'>,
  warningDays: number[],
  now: Date = getNow()
): DocumentValidity {
  return documentExpiry(document, warningDays, now);
}

export function validityLabel(validity: DocumentValidity): string {
  switch (validity.tier) {
    case 'Expired':
      return `Expired ${Math.abs(validity.daysLeft)} day(s) ago`;
    case 'Critical':
      return validity.daysLeft === 0
        ? 'Expires today'
        : `Renewal due in ${validity.daysLeft} day(s)`;
    case 'Expiring Soon':
      return `Expires in ${validity.daysLeft} day(s)`;
    default:
      return Number.isFinite(validity.daysLeft)
        ? `Valid for ${validity.daysLeft} more day(s)`
        : 'No expiry recorded';
  }
}

export function isRenewalRecord(document: DocumentItem): boolean {
  return Boolean(document.renewalOfId);
}

export function isSupersededDocument(document: DocumentItem): boolean {
  return document.status === 'Superseded';
}

export function isActiveDocument(document: DocumentItem): boolean {
  if (isSupersededDocument(document)) return false;
  return !(isRenewalRecord(document) && document.status === 'Rejected');
}

export function canRequestRenewal(
  document: DocumentItem,
  warningDays: number[],
  now: Date = getNow()
): boolean {
  if (isRenewalRecord(document) || isSupersededDocument(document)) return false;
  if (document.status === 'Rejected') return false;
  if (document.renewalStatus) return false;
  return documentValidity(document, warningDays, now).tier !== 'Valid';
}

export function canSubmitRenewal(document: DocumentItem): boolean {
  if (isRenewalRecord(document) || isSupersededDocument(document)) return false;
  return document.renewalStatus === 'Requested' || document.renewalStatus === 'Rejected';
}

export function canVerifyDocument(document: DocumentItem): boolean {
  return document.status === 'Pending';
}

export function documentsForRenewal(
  documents: DocumentItem[],
  warningDays: number[],
  now: Date = getNow()
): DocumentItem[] {
  const pendingRenewalFor = new Set(
    documents
      .filter((document) => isRenewalRecord(document) && document.status === 'Pending')
      .map((document) => document.renewalOfId as string)
  );

  return documents.filter((document) => {
    if (isRenewalRecord(document) || isSupersededDocument(document)) return false;
    if (pendingRenewalFor.has(document.id)) return false;
    if (
      document.renewalStatus === 'Requested' ||
      document.renewalStatus === 'Submitted' ||
      document.renewalStatus === 'Verified'
    ) {
      return false;
    }
    return documentValidity(document, warningDays, now).tier !== 'Valid';
  });
}

export interface DocumentSummary {
  total: number;
  valid: number;
  expiringSoon: number;
  critical: number;
  expired: number;
  renewalsPending: number;
  actionable: number;
}

export function summariseDocuments(
  documents: DocumentItem[],
  warningDays: number[],
  now: Date = getNow()
): DocumentSummary {
  const summary: DocumentSummary = {
    total: documents.length,
    valid: 0,
    expiringSoon: 0,
    critical: 0,
    expired: 0,
    renewalsPending: 0,
    actionable: documentsForRenewal(documents, warningDays, now).length
  };

  documents.filter(isActiveDocument).forEach((document) => {
    const { tier } = documentValidity(document, warningDays, now);
    if (tier === 'Expired') summary.expired += 1;
    else if (tier === 'Critical') summary.critical += 1;
    else if (tier === 'Expiring Soon') summary.expiringSoon += 1;
    else summary.valid += 1;
  });

  summary.renewalsPending = documents.filter(
    (document) =>
      !isRenewalRecord(document) &&
      !isSupersededDocument(document) &&
      (document.renewalStatus === 'Requested' || document.renewalStatus === 'Submitted')
  ).length;

  return summary;
}

export function markRenewalRequested(document: DocumentItem): DocumentItem {
  return { ...document, renewalStatus: 'Requested', renewalNote: undefined };
}

export function markRenewalSubmitted(document: DocumentItem): DocumentItem {
  return { ...document, renewalStatus: 'Submitted', renewalNote: undefined };
}

export function markRenewalRejected(document: DocumentItem, reason: string): DocumentItem {
  return { ...document, renewalStatus: 'Rejected', renewalNote: reason };
}

export interface RenewalInput {
  id: string;
  expiryDate: string;
  fileSize?: string;
  fileType?: string;
  storagePath?: string;
  note?: string;
}

export function buildRenewalRecord(
  original: DocumentItem,
  input: RenewalInput,
  now: Date = getNow()
): DocumentItem {
  return {
    id: input.id,
    title: `${original.title.replace(/\s*\(renewal\)$/i, '')} (renewal)`,
    category: original.category,
    instituteName: original.instituteName,
    instituteId: original.instituteId,
    region: original.region,
    uploadDate: toIsoDate(now),
    expiryDate: toIsoDate(input.expiryDate),
    status: 'Pending',
    fileSize: input.fileSize ?? original.fileSize,
    fileType: input.fileType ?? original.fileType,
    documentTypeCode: original.documentTypeCode,
    renewalOfId: original.id,
    renewalStatus: 'Submitted',
    renewalNote: input.note,
    storagePath: input.storagePath
  };
}

export interface DocumentVerificationResult {
  documents: DocumentItem[];
  verified?: DocumentItem;
  predecessor?: DocumentItem;
}

export function verifyDocumentInList(
  documents: DocumentItem[],
  id: string,
  actorName: string
): DocumentVerificationResult {
  const target = documents.find((document) => document.id === id);
  if (!target) return { documents };

  const verified: DocumentItem = {
    ...target,
    status: 'Verified',
    verifiedBy: actorName,
    renewalStatus: target.renewalOfId ? 'Verified' : target.renewalStatus
  };
  let predecessor: DocumentItem | undefined;

  const updated = documents.map((document) => {
    if (document.id === id) return verified;
    if (target.renewalOfId && document.id === target.renewalOfId) {
      predecessor = {
        ...document,
        status: 'Superseded',
        renewalStatus: 'Verified',
        verifiedBy: actorName
      };
      return predecessor;
    }
    return document;
  });

  return { documents: updated, verified, predecessor };
}

export interface DocumentRejectionResult {
  documents: DocumentItem[];
  rejected?: DocumentItem;
  predecessor?: DocumentItem;
}

export function rejectRenewalInList(
  documents: DocumentItem[],
  id: string,
  reason: string
): DocumentRejectionResult {
  const target = documents.find((document) => document.id === id);
  if (!target) return { documents };

  const rejected: DocumentItem = {
    ...target,
    status: 'Rejected',
    renewalStatus: 'Rejected',
    renewalNote: reason
  };
  let predecessor: DocumentItem | undefined;

  const updated = documents.map((document) => {
    if (document.id === id) return rejected;
    if (target.renewalOfId && document.id === target.renewalOfId) {
      predecessor = markRenewalRejected(document, reason);
      return predecessor;
    }
    return document;
  });

  return { documents: updated, rejected, predecessor };
}
