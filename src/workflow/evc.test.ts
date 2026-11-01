import { describe, expect, it } from 'vitest';
import type { Application, EVCVisit } from '../types';
import {
  EVC_CHECKLIST_ITEMS,
  buildEVCQueue,
  checklistProgress,
  evcScheduleCandidates,
  linkLegacyVisits,
  normalizeEVCVisit
} from './evc';

const NOW = new Date(2026, 5, 15);

function makeApp(overrides: Partial<Application> = {}): Application {
  return {
    id: 'AICTE/2026/0001',
    instituteId: 'INST-1',
    instituteName: 'Test Institute',
    type: 'Extension of Approval (EoA)',
    routeId: 'ROUTE_SCRUTINY_EVC',
    region: 'Northern',
    state: 'Delhi',
    stage: 'Expert Visit Committee (EVC)',
    status: 'In Progress',
    lastUpdated: '15 Jun 2026',
    appliedDate: '01 Jun 2026',
    category: 'Engineering',
    intakeProposed: 300,
    programs: ['CSE'],
    contactEmail: 'a@b.c',
    contactPhone: '000',
    timeline: [],
    documents: [],
    ...overrides
  };
}

function makeVisit(overrides: Partial<EVCVisit> = {}): EVCVisit {
  return {
    id: 'EVC-1001',
    applicationId: 'AICTE/2026/0001',
    instituteId: 'INST-1',
    instituteName: 'Test Institute',
    stateRegion: 'Delhi (Northern Region)',
    region: 'Northern',
    date: '2026-06-10',
    displayDate: { day: '10', month: 'Jun' },
    status: 'Scheduled',
    assignedCommittee: 'Committee A',
    committeeMembers: ['Prof. A', 'Dr. B'],
    mode: 'Physical',
    reportSubmitted: false,
    scheduledAt: '2026-06-10',
    reportDueAt: '2026-06-17',
    ...overrides
  };
}

describe('checklistProgress', () => {
  it('reports an empty checklist as incomplete', () => {
    const progress = checklistProgress(makeVisit());
    expect(progress).toMatchObject({ total: EVC_CHECKLIST_ITEMS.length, assessed: 0, complete: false });
  });

  it('requires every statutory item to be assessed', () => {
    const partial = EVC_CHECKLIST_ITEMS.slice(0, -1).map((item) => ({ id: item.id, passed: true }));
    expect(checklistProgress(makeVisit({ checklist: partial })).complete).toBe(false);

    const full = EVC_CHECKLIST_ITEMS.map((item, index) => ({ id: item.id, passed: index !== 0 }));
    const progress = checklistProgress(makeVisit({ checklist: full }));
    expect(progress.complete).toBe(true);
    expect(progress.failed).toBe(1);
  });
});

describe('evcScheduleCandidates', () => {
  it('includes a case whose next stage is EVC', () => {
    const app = makeApp({ stage: 'Scrutiny / Re-scrutiny' });
    expect(evcScheduleCandidates([app], [])).toHaveLength(1);
  });

  it('excludes cases with an active visit, beyond EVC, or on a route without EVC', () => {
    const linked = makeApp({ stage: 'Expert Visit Committee (EVC)' });
    const past = makeApp({
      id: 'AICTE/2026/0002',
      stage: 'Approval (Subject to Undertaking)'
    });
    const noEvc = makeApp({ id: 'AICTE/2026/0003', stage: 'Scrutiny / Re-scrutiny', type: 'Increase in Intake', routeId: 'ROUTE_SCRUTINY_ONLY' });

    expect(evcScheduleCandidates([linked], [makeVisit()])).toHaveLength(0);
    expect(evcScheduleCandidates([past], [])).toHaveLength(0);
    expect(evcScheduleCandidates([noEvc], [])).toHaveLength(0);
  });
});

describe('buildEVCQueue', () => {
  it('derives state from the linked visit and report deadline', () => {
    const app = makeApp();
    const overdue = makeVisit({ reportDueAt: '2026-06-01' });
    const [row] = buildEVCQueue([app], [overdue], NOW);
    expect(row.state).toBe('Report overdue');
    expect(row.daysOverdue).toBeGreaterThan(0);
  });

  it('marks completed reports and cases without a visit', () => {
    const completed = buildEVCQueue(
      [makeApp()],
      [makeVisit({ status: 'Completed', reportSubmitted: true })],
      NOW
    );
    expect(completed[0].state).toBe('Completed');

    const awaiting = buildEVCQueue([makeApp({ id: 'AICTE/2026/0009' })], [], NOW);
    expect(awaiting[0].state).toBe('Awaiting scheduling');
  });

  it('surfaces legacy visits without deadline fields as overdue', () => {
    const legacy = makeVisit({ scheduledAt: undefined, reportDueAt: undefined, date: '01 Jun 2026' });
    const [row] = buildEVCQueue([makeApp()], [legacy], NOW);
    expect(row.state).toBe('Report overdue');
    expect(row.daysOverdue).toBe(7);
  });

  it('ignores cases still in scrutiny or on routes without EVC', () => {
    const scrutiny = makeApp({ stage: 'Scrutiny / Re-scrutiny' });
    const noEvc = makeApp({
      id: 'AICTE/2026/0004',
      stage: 'Scrutiny / Re-scrutiny',
      type: 'Increase in Intake',
      routeId: 'ROUTE_SCRUTINY_ONLY'
    });
    expect(buildEVCQueue([scrutiny, noEvc], [], NOW)).toHaveLength(0);
  });
});

describe('normalizeEVCVisit', () => {
  it('backfills scheduledAt and reportDueAt from the display date', () => {
    const normalized = normalizeEVCVisit(
      makeVisit({ scheduledAt: undefined, reportDueAt: undefined, date: '28 Oct 2025' })
    );
    expect(normalized.scheduledAt).toBe('2025-10-28');
    expect(normalized.reportDueAt).toBe('2025-11-04');
  });

  it('keeps explicit deadlines and cancelled visits unchanged', () => {
    const explicit = makeVisit();
    expect(normalizeEVCVisit(explicit)).toBe(explicit);

    const cancelled = makeVisit({ status: 'Cancelled', scheduledAt: undefined, reportDueAt: undefined });
    expect(normalizeEVCVisit(cancelled).reportDueAt).toBeUndefined();
  });
});

describe('linkLegacyVisits', () => {  it('links an unlinked visit to the matching case by institute', () => {
    const app = makeApp();
    const visit = makeVisit({ applicationId: undefined });
    const result = linkLegacyVisits([app], [visit]);
    expect(result.changed).toBe(true);
    expect(result.visits[0].applicationId).toBe(app.id);
    expect(result.applications[0].evcVisitId).toBe(visit.id);
  });

  it('leaves already-linked data untouched', () => {
    const app = makeApp({ evcVisitId: 'EVC-1001' });
    const result = linkLegacyVisits([app], [makeVisit()]);
    expect(result.changed).toBe(false);
  });
});
