import { describe, expect, it } from 'vitest';
import { HttpError } from './http.ts';
import {
  parseApplication,
  parseComplianceRecord,
  parseDocumentItem,
  parseNotification,
  parseTransition,
  parseUndertaking
} from './payload.ts';

const applicationBody = {
  id: 'APP-1',
  instituteId: 'INST-1',
  instituteName: 'Sunrise Institute',
  type: 'Extension of Approval',
  region: 'Northern',
  state: 'Delhi',
  stage: 'Submitted',
  status: 'In Progress',
  lastUpdated: '01 Nov 2026',
  appliedDate: '2026-10-31',
  category: 'Technical',
  intakeProposed: 120,
  programs: ['CSE'],
  contactEmail: 'office@example.edu',
  contactPhone: '+91 11 29581000',
  timeline: [],
  documents: []
};

function expectRejected(run: () => unknown, code: string): void {
  try {
    run();
    throw new Error('Expected the parser to reject the body.');
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).code).toBe(code);
  }
}

describe('request payload parsers', () => {
  it('parses a complete application and defaults optional fields', () => {
    const app = parseApplication({ ...applicationBody, version: 3 });
    expect(app.id).toBe('APP-1');
    expect(app.region).toBe('Northern');
    expect(app.version).toBe(3);
    expect(app.programs).toEqual(['CSE']);
    expect(app.remarks).toBeUndefined();
    expect(app.decision).toBeUndefined();
  });

  it('rejects unknown regions, stages and statuses', () => {
    expectRejected(() => parseApplication({ ...applicationBody, region: 'Atlantis' }), 'INVALID_BODY');
    expectRejected(() => parseApplication({ ...applicationBody, stage: 'Done' }), 'INVALID_BODY');
    expectRejected(() => parseApplication({ ...applicationBody, status: 'Cool' }), 'INVALID_BODY');
  });

  it('requires a JSON array for the timeline', () => {
    expectRejected(() => parseApplication({ ...applicationBody, timeline: 'none' }), 'INVALID_BODY');
  });

  it('never accepts verification fields from the request body', () => {
    const compliance = parseComplianceRecord({
      id: 'COMP-1',
      title: 'Fire safety certificate',
      category: 'Compliance Submissions',
      instituteName: 'Sunrise Institute',
      instituteId: 'INST-1',
      region: 'Northern',
      status: 'Submitted',
      dueDate: '2026-12-01',
      urgency: 'high',
      verifiedBy: 'Forged Authority',
      verifiedAt: '2026-11-01'
    });
    expect('verifiedBy' in compliance).toBe(false);
    expect('verifiedAt' in compliance).toBe(false);

    const document = parseDocumentItem({
      id: 'DOC-1',
      title: 'Land deed',
      category: 'Land & Building',
      instituteName: 'Sunrise Institute',
      instituteId: 'INST-1',
      region: 'Northern',
      uploadDate: '2026-10-01',
      expiryDate: '2031-10-01',
      status: 'Pending',
      fileSize: '2 MB',
      fileType: 'PDF',
      verifiedBy: 'Forged Authority'
    });
    expect('verifiedBy' in document).toBe(false);

    const undertaking = parseUndertaking({
      id: 'UND-1',
      applicationId: 'APP-1',
      instituteId: 'INST-1',
      instituteName: 'Sunrise Institute',
      region: 'Northern',
      conditionCode: 'LAND-LEASE',
      title: 'Submit registered lease',
      dueDate: '2026-12-31',
      status: 'Pending',
      verifiedBy: 'Forged Authority',
      submittedBy: 'Forged Submitter'
    });
    expect('verifiedBy' in undertaking).toBe(false);
    expect('submittedBy' in undertaking).toBe(false);
  });

  it('defaults notification read state to false', () => {
    const notification = parseNotification({
      id: 'NOTIF-1',
      title: 'Application received',
      description: 'A new application was received.',
      category: 'application',
      timestamp: '01 Nov 2026, 10:00 AM',
      priority: 'medium'
    });
    expect(notification.read).toBe(false);
    expect(notification.targetRole).toBeUndefined();
  });

  it('parses transitions without trusting client actor fields', () => {
    const draft = parseTransition({
      action: 'APPROVE',
      reasonCode: 'APPROVED_FINAL',
      note: 'Approved after scrutiny.',
      expectedVersion: 4,
      actor: { id: 'USR-FORGED', name: 'Forged Authority', role: 'SUPER_ADMIN' },
      competentAuthority: 'Forged Authority'
    });
    expect(draft).toEqual({
      action: 'APPROVE',
      toStage: undefined,
      reasonCode: 'APPROVED_FINAL',
      note: 'Approved after scrutiny.',
      expectedVersion: 4,
      overrideUndertaking: undefined
    });
    expect('actor' in draft).toBe(false);
    expect('competentAuthority' in draft).toBe(false);
  });

  it('rejects unknown transition actions and stages', () => {
    expectRejected(() => parseTransition({ action: 'DELETE' }), 'INVALID_BODY');
    expectRejected(
      () => parseTransition({ action: 'FORWARD', toStage: 'Imaginary Stage' }),
      'INVALID_BODY'
    );
  });
});
