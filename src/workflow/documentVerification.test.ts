import { describe, expect, it } from 'vitest';
import type {
  Application,
  DocumentExtraction,
  DocumentItem,
  VerificationField
} from '../types';
import {
  AI_ASSISTED_DISCLAIMER,
  buildDeterministicSummary,
  buildVerificationReport,
  compareChecklist,
  evaluateDocumentVerification,
  institutionNameSimilarity,
  requiredChecklistForApplication
} from './documentVerification';

const NOW = new Date(2026, 10, 1);
const WARNINGS = [90, 60, 30];

function field(value: string | null, confidence: VerificationField['confidence'] = 'high'): VerificationField {
  return { value, confidence, evidence: '' };
}

const application: Application = {
  id: 'APP-2026-0001',
  instituteId: 'INST-1',
  instituteName: 'Sunrise Institute of Technology',
  type: 'Extension of Approval (EoA)',
  region: 'Western',
  state: 'Maharashtra',
  stage: 'Scrutiny / Re-scrutiny',
  status: 'In Progress',
  lastUpdated: '2026-10-01',
  appliedDate: '2026-09-15',
  category: 'Technical Institute',
  intakeProposed: 360,
  programs: ['Computer Engineering'],
  contactEmail: 'principal@sit.example',
  contactPhone: '+91 90000 00000',
  timeline: [],
  documents: [],
  routeId: 'ROUTE_SCRUTINY_EVC'
};

function document(overrides: Partial<DocumentItem> & { id: string }): DocumentItem {
  const { id, ...rest } = overrides;
  return {
    id,
    title: 'Fire safety NOC',
    category: 'Fire Safety',
    instituteId: 'INST-1',
    instituteName: 'Sunrise Institute of Technology',
    region: 'Western',
    uploadDate: '2024-03-12',
    expiryDate: '2027-03-11',
    status: 'Verified',
    fileSize: '1.2 MB',
    fileType: 'PDF',
    documentTypeCode: 'FIRE_SAFETY_NOC',
    ...rest
  };
}

function extraction(overrides: Partial<DocumentExtraction['fields']> = {}): DocumentExtraction {
  return {
    method: 'text',
    pageCount: 1,
    textPreview: 'FIRE SAFETY NO OBJECTION CERTIFICATE',
    fields: {
      institutionName: field('Sunrise Institute of Technology'),
      documentType: field('FIRE_SAFETY_NOC'),
      registrationNumber: field('FSN/2024/1187'),
      issueDate: field('2024-03-12'),
      expiryDate: field('2027-03-11'),
      issuingAuthority: field('Municipal Fire Department'),
      ...overrides
    },
    warnings: []
  };
}

function evaluate(
  overrides: Partial<Parameters<typeof evaluateDocumentVerification>[0]> = {}
) {
  return evaluateDocumentVerification({
    application,
    documents: [],
    documentTypeCode: 'FIRE_SAFETY_NOC',
    extraction: extraction(),
    fileName: 'fire-noc.pdf',
    fileHash: 'hash-1',
    warningDays: WARNINGS,
    now: NOW,
    ...overrides
  });
}

describe('requiredChecklistForApplication', () => {
  it('selects the checklist for the resolved workflow route', () => {
    const checklist = requiredChecklistForApplication(application);
    const labels = checklist.map((row) => row.label);

    expect(labels).toContain('Fire safety NOC');
    expect(labels).toContain('AICTE approval letter');
    expect(checklist.every((row) => row.mandatory)).toBe(true);
  });

  it('falls back to the EoA checklist when the type is unknown', () => {
    const checklist = requiredChecklistForApplication({
      ...application,
      routeId: undefined,
      type: 'Extension of Approval (EoA)'
    });

    expect(checklist.map((row) => row.codes.join('/'))).toContain('FIRE_SAFETY_NOC');
  });
});

describe('institutionNameSimilarity', () => {
  it('scores overlapping institution names highly', () => {
    expect(institutionNameSimilarity('Sunrise Institute of Technology', 'SUNRISE INSTITUTE OF TECHNOLOGY, PUNE')).toBe(1);
  });

  it('scores unrelated names low', () => {
    expect(institutionNameSimilarity('Deccan College of Engineering', 'Sunrise Institute of Technology')).toBe(0);
  });
});

describe('compareChecklist', () => {
  it('marks the current upload as pending verification', () => {
    const rows = compareChecklist({
      application,
      documents: [],
      documentTypeCode: 'FIRE_SAFETY_NOC',
      warningDays: WARNINGS,
      now: NOW
    });

    const fire = rows.find((row) => row.code.includes('FIRE_SAFETY_NOC'));
    const approval = rows.find((row) => row.code.includes('AICTE_APPROVAL_LETTER'));

    expect(fire?.status).toBe('Pending Verification');
    expect(fire?.evidenceDocumentIds).toContain('CURRENT_UPLOAD');
    expect(approval?.status).toBe('Missing');
  });

  it('marks a valid verified record as present', () => {
    const rows = compareChecklist({
      application,
      documents: [document({ id: 'DOC-1' })],
      documentTypeCode: 'FIRE_SAFETY_NOC',
      warningDays: WARNINGS,
      now: NOW
    });

    const fire = rows.find((row) => row.code.includes('FIRE_SAFETY_NOC'));
    expect(fire?.status).toBe('Present');
    expect(fire?.evidenceDocumentIds).toEqual(['DOC-1']);
  });

  it('marks an expired record as expired when nothing else is available', () => {
    const rows = compareChecklist({
      application,
      documents: [document({ id: 'DOC-OLD', expiryDate: '2025-01-01' })],
      documentTypeCode: 'AICTE_APPROVAL_LETTER',
      warningDays: WARNINGS,
      now: NOW
    });

    const fire = rows.find((row) => row.code.includes('FIRE_SAFETY_NOC'));
    expect(fire?.status).toBe('Expired');
  });

  it('marks rejected records as rejected', () => {
    const rows = compareChecklist({
      application,
      documents: [document({ id: 'DOC-REJ', status: 'Rejected' })],
      documentTypeCode: 'AICTE_APPROVAL_LETTER',
      warningDays: WARNINGS,
      now: NOW
    });

    const fire = rows.find((row) => row.code.includes('FIRE_SAFETY_NOC'));
    expect(fire?.status).toBe('Rejected');
  });
});

describe('evaluateDocumentVerification', () => {
  it('adds no critical findings for a complete, current document', () => {
    const { issues } = evaluate();

    expect(issues.filter((issue) => issue.severity === 'critical')).toHaveLength(0);
    expect(issues.map((issue) => issue.code)).not.toContain('EXPIRED');
    expect(issues.map((issue) => issue.code)).not.toContain('MISSING_FIELD');
  });

  it('flags a missing institution name as critical', () => {
    const { issues } = evaluate({
      extraction: extraction({ institutionName: field(null, 'low') })
    });

    const issue = issues.find((entry) => entry.field === 'institutionName');
    expect(issue?.code).toBe('MISSING_FIELD');
    expect(issue?.severity).toBe('critical');
  });

  it('flags missing registration details for documents that normally carry them', () => {
    const { issues } = evaluate({
      documentTypeCode: 'UNIVERSITY_AFFILIATION',
      extraction: extraction({
        documentType: field('UNIVERSITY_AFFILIATION'),
        registrationNumber: field(null, 'low'),
        issueDate: field('2026-06-01'),
        expiryDate: field('2027-05-31')
      })
    });

    expect(issues.some((issue) => issue.field === 'registrationNumber' && issue.code === 'MISSING_FIELD')).toBe(true);
  });

  it('flags low-confidence readings', () => {
    const { issues } = evaluate({
      extraction: extraction({ institutionName: field('Sunrise Institute of Technology', 'low') })
    });

    expect(issues.some((issue) => issue.code === 'LOW_CONFIDENCE' && issue.field === 'institutionName')).toBe(true);
  });

  it('flags an expired document', () => {
    const { issues } = evaluate({
      extraction: extraction({ expiryDate: field('2026-01-15') })
    });

    const expired = issues.find((issue) => issue.code === 'EXPIRED');
    expect(expired?.severity).toBe('critical');
    expect(expired?.message).toContain('2026-01-15');
  });

  it('flags a document expiring within the configured window', () => {
    const { issues } = evaluate({
      extraction: extraction({ expiryDate: field('2026-11-20') })
    });

    expect(issues.some((issue) => issue.code === 'EXPIRING_SOON')).toBe(true);
  });

  it('flags an expiry date before the issue date', () => {
    const { issues } = evaluate({
      extraction: extraction({ issueDate: field('2027-01-01'), expiryDate: field('2026-01-01') })
    });

    expect(issues.some((issue) => issue.code === 'DATE_ORDER_INVALID')).toBe(true);
  });

  it('flags validity that drifts from the configured document window', () => {
    const { issues } = evaluate({
      extraction: extraction({ expiryDate: field('2032-01-01') })
    });

    expect(issues.some((issue) => issue.code === 'VALIDITY_MISMATCH')).toBe(true);
  });

  it('flags an institution name that does not match the application', () => {
    const { issues } = evaluate({
      extraction: extraction({ institutionName: field('Deccan College of Engineering') })
    });

    expect(issues.some((issue) => issue.code === 'INSTITUTION_MISMATCH')).toBe(true);
  });

  it('flags a document that looks like a different document type', () => {
    const { issues } = evaluate({
      extraction: extraction({ documentType: field('UNIVERSITY_AFFILIATION') })
    });

    expect(issues.some((issue) => issue.code === 'DOCUMENT_TYPE_MISMATCH')).toBe(true);
  });

  it('flags a duplicate file hash', () => {
    const { issues } = evaluate({
      existingReports: [
        buildVerificationReport({
          application,
          documents: [],
          documentTypeCode: 'FIRE_SAFETY_NOC',
          extraction: extraction(),
          fileName: 'fire-noc-copy.pdf',
          fileHash: 'hash-1',
          warningDays: WARNINGS,
          now: NOW,
          id: 'VER-1',
          createdAt: '2026-10-20',
          createdBy: 'Officer',
          createdByUserId: 'user-1',
          fileType: 'application/pdf',
          fileSize: 1024
        })
      ]
    });

    expect(issues.some((issue) => issue.code === 'DUPLICATE_FILE')).toBe(true);
  });

  it('flags missing and expired checklist documents', () => {
    const { issues } = evaluate({
      documentTypeCode: 'AICTE_APPROVAL_LETTER',
      extraction: extraction({ documentType: field('AICTE_APPROVAL_LETTER') }),
      documents: [document({ id: 'DOC-OLD', expiryDate: '2025-01-01' })]
    });

    expect(issues.some((issue) => issue.code === 'CHECKLIST_MISSING')).toBe(true);
    expect(issues.some((issue) => issue.code === 'CHECKLIST_EXPIRED')).toBe(true);
  });
});

describe('buildVerificationReport', () => {
  it('stores an advisory report that never changes the application stage', () => {
    const report = buildVerificationReport({
      application,
      documents: [],
      documentTypeCode: 'FIRE_SAFETY_NOC',
      extraction: extraction(),
      fileName: 'fire-noc.pdf',
      fileHash: 'hash-1',
      warningDays: WARNINGS,
      now: NOW,
      id: 'VER-1',
      createdAt: '2026-11-01',
      createdBy: 'Regional Officer',
      createdByUserId: 'user-1',
      fileType: 'application/pdf',
      fileSize: 2048
    });

    expect(report.status).toBe('Pending Review');
    expect(report.disclaimer).toBe(AI_ASSISTED_DISCLAIMER);
    expect(report.aiSummary?.provider).toBe('deterministic');
    expect(report.checklist.length).toBeGreaterThan(0);
    expect(application.stage).toBe('Scrutiny / Re-scrutiny');
  });

  it('uses the supplied advisory summary when present', () => {
    const report = buildVerificationReport({
      application,
      documents: [],
      documentTypeCode: 'FIRE_SAFETY_NOC',
      extraction: extraction(),
      fileName: 'fire-noc.pdf',
      fileHash: 'hash-1',
      warningDays: WARNINGS,
      now: NOW,
      id: 'VER-2',
      createdAt: '2026-11-01',
      createdBy: 'Regional Officer',
      createdByUserId: 'user-1',
      fileType: 'application/pdf',
      fileSize: 2048,
      aiSummary: { text: 'All required fields were read.', provider: 'gemini', generatedAt: '2026-11-01' }
    });

    expect(report.aiSummary?.provider).toBe('gemini');
    expect(report.aiSummary?.text).toBe('All required fields were read.');
  });
});

describe('buildDeterministicSummary', () => {
  it('counts findings and keeps the human-review caveat', () => {
    const summary = buildDeterministicSummary(evaluate());

    expect(summary).toContain('warning(s)');
    expect(summary).toContain('mandatory checklist documents');
    expect(summary).toContain('officer must review');
  });
});
