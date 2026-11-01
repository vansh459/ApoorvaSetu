import { describe, expect, it } from 'vitest';
import type { Application, Undertaking } from '../types';
import { DEFAULT_WORKFLOW_CONFIG } from './config';
import {
  UNDERTAKING_CONDITIONS,
  buildUndertaking,
  defaultConditionCodesFor,
  planUndertakingsForApproval,
  summariseUndertakings,
  undertakingBucket
} from './undertakings';
import { toIsoDate } from '../utils/dates';

const now = new Date(2026, 0, 15);

function dueIn(days: number): string {
  return toIsoDate(new Date(2026, 0, 15 + days));
}

function makeApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: 'AICTE/2026/1',
    instituteId: 'INST-101',
    instituteName: 'Test Institute',
    type: 'Extension of Approval (EoA)',
    region: 'Northern',
    state: 'Delhi',
    stage: 'Approval (Subject to Undertaking)',
    status: 'In Progress',
    lastUpdated: '15 Jan 2026',
    appliedDate: '01 Jan 2026',
    category: 'Engineering & Technology',
    intakeProposed: 120,
    programs: ['Computer Science'],
    contactEmail: 'registrar@test.edu',
    contactPhone: '+91 90000 00000',
    documents: [],
    timeline: [],
    ...overrides
  };
}

function makeUndertaking(overrides: Partial<Undertaking> = {}): Undertaking {
  return {
    id: 'UND-1',
    applicationId: 'AICTE/2026/1',
    instituteId: 'INST-101',
    instituteName: 'Test Institute',
    region: 'Northern',
    conditionCode: 'UND_FEE_REFUND',
    title: 'Fee refund policy affidavit',
    dueDate: dueIn(10),
    evidenceDocumentIds: [],
    status: 'Pending',
    escalationLevel: 0,
    ...overrides
  };
}

describe('undertaking conditions', () => {
  it('keeps condition codes unique', () => {
    const codes = UNDERTAKING_CONDITIONS.map((condition) => condition.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('selects faculty and fee conditions for an EoA route', () => {
    expect(defaultConditionCodesFor(makeApplication())).toEqual([
      'UND_FACULTY_RETENTION',
      'UND_FEE_REFUND'
    ]);
  });

  it('selects land and barrier-free conditions for a new campus route', () => {
    expect(
      defaultConditionCodesFor(makeApplication({ type: 'New Technical Campus' }))
    ).toEqual(['UND_LAND_CONVERSION', 'UND_BARRIER_FREE']);
  });
});

describe('undertaking planning', () => {
  it('builds one pending undertaking per default condition with a future deadline', () => {
    const app = makeApplication();
    const planned = planUndertakingsForApproval(app, DEFAULT_WORKFLOW_CONFIG, now);

    expect(planned).toHaveLength(2);
    expect(new Set(planned.map((item) => item.id)).size).toBe(2);
    planned.forEach((item) => {
      expect(item.applicationId).toBe(app.id);
      expect(item.instituteId).toBe(app.instituteId);
      expect(item.region).toBe(app.region);
      expect(item.status).toBe('Pending');
      expect(item.escalationLevel).toBe(0);
      expect(item.dueDate > toIsoDate(now)).toBe(true);
    });
  });

  it('honours an explicit due date', () => {
    const undertaking = buildUndertaking(
      makeApplication(),
      'UND_FIRE_NOC',
      DEFAULT_WORKFLOW_CONFIG,
      now,
      '2026-02-01'
    );
    expect(undertaking.dueDate).toBe('2026-02-01');
  });
});

describe('undertaking status buckets', () => {
  it('classifies overdue, submitted, pending, verified and rejected records', () => {
    expect(
      undertakingBucket(makeUndertaking({ dueDate: dueIn(-5) }), DEFAULT_WORKFLOW_CONFIG, now)
    ).toBe('Overdue');
    expect(
      undertakingBucket(
        makeUndertaking({ dueDate: dueIn(5), status: 'Submitted' }),
        DEFAULT_WORKFLOW_CONFIG,
        now
      )
    ).toBe('Submitted');
    expect(
      undertakingBucket(
        makeUndertaking({ dueDate: dueIn(-5), status: 'Submitted' }),
        DEFAULT_WORKFLOW_CONFIG,
        now
      )
    ).toBe('Submitted');
    expect(
      undertakingBucket(makeUndertaking({ dueDate: dueIn(5) }), DEFAULT_WORKFLOW_CONFIG, now)
    ).toBe('Pending');
    expect(
      undertakingBucket(
        makeUndertaking({ dueDate: dueIn(-5), status: 'Verified' }),
        DEFAULT_WORKFLOW_CONFIG,
        now
      )
    ).toBe('Verified');
    expect(
      undertakingBucket(
        makeUndertaking({ dueDate: dueIn(5), status: 'Rejected' }),
        DEFAULT_WORKFLOW_CONFIG,
        now
      )
    ).toBe('Rejected');
  });

  it('treats an explicitly overdue status as overdue even when the date is extended', () => {
    expect(
      undertakingBucket(
        makeUndertaking({ dueDate: dueIn(30), status: 'Overdue' }),
        DEFAULT_WORKFLOW_CONFIG,
        now
      )
    ).toBe('Overdue');
  });

  it('summarises buckets so the open count reconciles', () => {
    const summary = summariseUndertakings(
      [
        makeUndertaking({ id: 'UND-1', dueDate: dueIn(5) }),
        makeUndertaking({ id: 'UND-2', dueDate: dueIn(2), status: 'Submitted' }),
        makeUndertaking({ id: 'UND-3', dueDate: dueIn(-3) }),
        makeUndertaking({ id: 'UND-4', dueDate: dueIn(-1), status: 'Verified' }),
        makeUndertaking({ id: 'UND-5', dueDate: dueIn(8), status: 'Rejected' }),
        makeUndertaking({ id: 'UND-6', dueDate: dueIn(20) })
      ],
      DEFAULT_WORKFLOW_CONFIG,
      now
    );

    expect(summary).toEqual({
      total: 6,
      open: 4,
      pending: 2,
      submitted: 1,
      overdue: 1,
      verified: 1,
      rejected: 1
    });
    expect(summary.open).toBe(summary.pending + summary.submitted + summary.overdue);
  });
});
