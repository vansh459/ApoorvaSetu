import { describe, expect, it } from 'vitest';
import type { DocumentItem } from '../types';
import { DEFAULT_WORKFLOW_CONFIG } from './config';
import { sweepDeadlines } from './alerts';
import {
  buildRenewalRecord,
  canRequestRenewal,
  canSubmitRenewal,
  defaultExpiryDate,
  documentValidity,
  documentsForRenewal,
  getDocumentType,
  inferDocumentType,
  markRenewalRequested,
  markRenewalSubmitted,
  normalizeDocument,
  rejectRenewalInList,
  summariseDocuments,
  validityLabel,
  verifyDocumentInList
} from './documents';

const NOW = new Date(2026, 10, 1);
const WARNINGS = [60, 30, 7];

function doc(overrides: Partial<DocumentItem> & { id: string }): DocumentItem {
  return {
    title: 'Registered Land Lease Deed',
    category: 'Land & Building',
    instituteName: 'Test Institute',
    instituteId: 'INST-101',
    region: 'Northern',
    uploadDate: '2025-01-01',
    expiryDate: '2030-01-01',
    status: 'Verified',
    fileSize: '1.2 MB',
    fileType: 'PDF',
    documentTypeCode: 'LAND_LEASE_DEED',
    ...overrides
  };
}

describe('document types', () => {
  it('resolves an explicit code before keyword matching', () => {
    expect(getDocumentType('FIRE_SAFETY_NOC')?.category).toBe('Fire Safety');
    expect(
      inferDocumentType({
        title: 'Statutory fire clearance certificate',
        category: 'Land & Building',
        documentTypeCode: 'BUILDING_STABILITY'
      })?.code
    ).toBe('BUILDING_STABILITY');
  });

  it('infers a type from the title and falls back to the category', () => {
    expect(
      inferDocumentType({
        title: 'Registered land lease deed for the campus',
        category: 'Land & Building'
      })?.code
    ).toBe('LAND_LEASE_DEED');
    expect(
      inferDocumentType({
        title: 'Annual submission',
        category: 'Audit & Finance'
      })?.code
    ).toBe('AUDITED_FINANCIALS');
  });

  it('computes a default expiry and clamps month-end dates', () => {
    expect(defaultExpiryDate('2026-01-31', 'AUDITED_FINANCIALS')).toBe('2027-01-31');
    expect(defaultExpiryDate('2024-02-29', 'AUDITED_FINANCIALS')).toBe('2025-02-28');
    expect(defaultExpiryDate('2026-01-01', 'FIRE_SAFETY_NOC')).toBe('2029-01-01');
  });

  it('normalizes legacy display dates and backfills the type code', () => {
    const legacy = doc({
      id: 'DOC-LEGACY',
      title: 'Registered Land Lease Deed',
      uploadDate: '12 Sep 2025',
      expiryDate: '15 Dec 2028',
      documentTypeCode: undefined
    });
    const normalized = normalizeDocument(legacy);
    expect(normalized.uploadDate).toBe('2025-09-12');
    expect(normalized.expiryDate).toBe('2028-12-15');
    expect(normalized.documentTypeCode).toBe('LAND_LEASE_DEED');
  });
});

describe('document validity', () => {
  it('classifies the configured warning windows', () => {
    expect(documentValidity({ expiryDate: '2027-01-01' }, WARNINGS, NOW).tier).toBe('Valid');
    expect(documentValidity({ expiryDate: '2026-12-31' }, WARNINGS, NOW).tier).toBe('Expiring Soon');
    expect(documentValidity({ expiryDate: '2026-12-01' }, WARNINGS, NOW).tier).toBe('Critical');
    expect(documentValidity({ expiryDate: '2026-11-01' }, WARNINGS, NOW).tier).toBe('Critical');
    expect(documentValidity({ expiryDate: '2026-10-31' }, WARNINGS, NOW).tier).toBe('Expired');
  });

  it('phrases the remaining validity for the officer', () => {
    expect(validityLabel(documentValidity({ expiryDate: '2026-11-08' }, WARNINGS, NOW))).toBe(
      'Renewal due in 7 day(s)'
    );
    expect(validityLabel(documentValidity({ expiryDate: '2026-10-20' }, WARNINGS, NOW))).toBe(
      'Expired 12 day(s) ago'
    );
  });
});

describe('renewal planning', () => {
  const expired = doc({ id: 'DOC-A', expiryDate: '2026-09-01' });
  const expiring = doc({ id: 'DOC-B', expiryDate: '2026-11-08' });
  const valid = doc({ id: 'DOC-C', expiryDate: '2027-06-01' });
  const submitted = doc({
    id: 'DOC-D',
    expiryDate: '2026-09-15',
    renewalStatus: 'Submitted'
  });
  const superseded = doc({
    id: 'DOC-E',
    expiryDate: '2026-01-01',
    status: 'Superseded',
    renewalStatus: 'Verified'
  });
  const rejectedRenewal = doc({
    id: 'DOC-F',
    expiryDate: '2026-10-01',
    renewalStatus: 'Rejected',
    renewalNote: 'Certificate predates the issue date.'
  });
  const renewalRecord = doc({
    id: 'DOC-G',
    expiryDate: '2029-10-01',
    status: 'Pending',
    renewalOfId: 'DOC-C',
    renewalStatus: 'Submitted'
  });
  const documents = [expired, expiring, valid, submitted, superseded, rejectedRenewal, renewalRecord];

  it('lists only documents that genuinely need renewal', () => {
    const queue = documentsForRenewal(documents, WARNINGS, NOW);
    expect(queue.map((item) => item.id)).toEqual(['DOC-A', 'DOC-B', 'DOC-F']);
  });

  it('requires a request before renewal evidence can be submitted', () => {
    expect(canRequestRenewal(expired, WARNINGS, NOW)).toBe(true);
    expect(canRequestRenewal(valid, WARNINGS, NOW)).toBe(false);
    expect(canSubmitRenewal(expired)).toBe(false);
    expect(canSubmitRenewal(markRenewalRequested(expired))).toBe(true);
    expect(canSubmitRenewal(submitted)).toBe(false);
  });

  it('reconciles the summary counts with the active repository', () => {
    const summary = summariseDocuments(documents, WARNINGS, NOW);
    expect(summary.total).toBe(7);
    expect(summary.valid).toBe(2);
    expect(summary.expiringSoon).toBe(0);
    expect(summary.critical).toBe(1);
    expect(summary.expired).toBe(3);
    expect(summary.renewalsPending).toBe(1);
    expect(summary.actionable).toBe(3);
  });

  it('builds a linked renewal record and marks the original submitted', () => {
    const renewal = buildRenewalRecord(
      markRenewalRequested(expired),
      { id: 'DOC-RENEW', expiryDate: '2029-09-01', fileSize: '2.0 MB', note: 'Fresh deed' },
      NOW
    );
    expect(renewal).toMatchObject({
      id: 'DOC-RENEW',
      renewalOfId: 'DOC-A',
      status: 'Pending',
      renewalStatus: 'Submitted',
      expiryDate: '2029-09-01',
      category: 'Land & Building',
      instituteId: 'INST-101',
      documentTypeCode: 'LAND_LEASE_DEED'
    });
    expect(renewal.title.endsWith('(renewal)')).toBe(true);
    expect(markRenewalSubmitted(expired).renewalStatus).toBe('Submitted');
  });

  it('supersedes the predecessor atomically when the renewal is verified', () => {
    const renewalForA = doc({
      id: 'DOC-G2',
      expiryDate: '2029-09-01',
      status: 'Pending',
      renewalOfId: 'DOC-A',
      renewalStatus: 'Submitted'
    });
    const result = verifyDocumentInList([expired, renewalForA], 'DOC-G2', 'Dr. R. K. Sharma');
    expect(result.verified?.status).toBe('Verified');
    expect(result.verified?.renewalStatus).toBe('Verified');
    expect(result.predecessor?.id).toBe('DOC-A');
    expect(result.predecessor?.status).toBe('Superseded');
    expect(result.predecessor?.renewalStatus).toBe('Verified');
    expect(result.documents.find((item) => item.id === 'DOC-A')?.status).toBe('Superseded');
  });

  it('rejects renewal evidence on both ends of the chain', () => {
    const renewalForA = doc({
      id: 'DOC-G2',
      expiryDate: '2029-09-01',
      status: 'Pending',
      renewalOfId: 'DOC-A',
      renewalStatus: 'Submitted'
    });
    const result = rejectRenewalInList(
      [doc({ id: 'DOC-A', renewalStatus: 'Submitted' }), renewalForA],
      'DOC-G2',
      'Certificate predates the visit.'
    );
    expect(result.rejected?.status).toBe('Rejected');
    expect(result.rejected?.renewalNote).toBe('Certificate predates the visit.');
    expect(result.predecessor?.renewalStatus).toBe('Rejected');
    expect(result.predecessor?.renewalNote).toBe('Certificate predates the visit.');
  });
});

describe('document alert sweep', () => {
  it('alerts the original, ignores superseded and renewal records, and stays idempotent', () => {
    const documents = [
      doc({ id: 'DOC-ORIGINAL', expiryDate: '2026-09-01', renewalStatus: 'Submitted' }),
      doc({
        id: 'DOC-SUPERSEDED',
        expiryDate: '2025-09-01',
        status: 'Superseded',
        renewalStatus: 'Verified'
      }),
      doc({
        id: 'DOC-RENEWAL',
        expiryDate: '2029-09-01',
        status: 'Pending',
        renewalOfId: 'DOC-SUPERSEDED',
        renewalStatus: 'Submitted'
      })
    ];

    const first = sweepDeadlines({
      applications: [],
      evcVisits: [],
      undertakings: [],
      documents,
      alerts: [],
      escalations: [],
      config: DEFAULT_WORKFLOW_CONFIG,
      now: NOW
    });

    expect(first.createdAlerts).toHaveLength(1);
    expect(first.createdAlerts[0]).toMatchObject({
      entityId: 'DOC-ORIGINAL',
      rule: 'document.expiry',
      tier: 'Expired'
    });

    const second = sweepDeadlines({
      applications: [],
      evcVisits: [],
      undertakings: [],
      documents,
      alerts: first.alerts,
      escalations: first.escalations,
      config: DEFAULT_WORKFLOW_CONFIG,
      now: NOW
    });
    expect(second.createdAlerts).toHaveLength(0);
  });
});
