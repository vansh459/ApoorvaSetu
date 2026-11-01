import { describe, expect, it } from 'vitest';
import {
  activeAlerts,
  ageingBuckets,
  alertSummary,
  applicationProgress,
  bottleneckRanking,
  complianceSnapshot,
  evcQueueSummary,
  latestUpdated,
  linkedVisitFor,
  officerWorkload,
  pendingReports,
  pipelineMetrics,
  regionBreakdown,
  regionStageMatrix,
  stagePendency
} from './selectors';
import { DEFAULT_WORKFLOW_CONFIG } from './config';
import { makeApplication } from './__tests__/fixtures';
import type { Application, DocumentItem, EVCVisit, SystemAlert, Undertaking } from '../types';
import { toIsoDate } from '../utils/dates';

const now = new Date(2026, 2, 1);

function daysAgo(days: number): string {
  return toIsoDate(new Date(2026, 2, 1 - days));
}

function app(
  stage: Application['stage'] = 'Scrutiny / Re-scrutiny',
  overrides: Partial<Application> = {}
) {
  return makeApplication({
    stage,
    stageEnteredAt: '2026-02-01',
    stageDueAt: '2026-12-31',
    ...overrides
  });
}

describe('pipeline metrics', () => {
  it('reconciles pending, terminal, action-required and breached counts', () => {
    const applications = [
      app('Scrutiny / Re-scrutiny', {
        stageDueAt: '2026-01-31',
        stageEnteredAt: '2026-01-01'
      }),
      app('Expert Visit Committee (EVC)', { status: 'Pending' }),
      app('Final Approval', {
        status: 'Action Required',
        deficiencies: [
          {
            code: 'DOC_MISSING',
            note: 'Lease deed missing',
            stage: 'Scrutiny / Re-scrutiny',
            raisedAt: '2026-02-02',
            raisedBy: 'RO'
          }
        ]
      }),
      app('Final Approval', { status: 'Approved' }),
      app('Final Approval', { status: 'Rejected' })
    ];

    const metrics = pipelineMetrics(applications, DEFAULT_WORKFLOW_CONFIG, now);

    expect(metrics).toMatchObject({
      total: 5,
      pending: 3,
      approved: 1,
      rejected: 1,
      actionRequired: 1,
      breached: 1
    });
  });

  it('pauses the clock for returned cases', () => {
    const metrics = pipelineMetrics(
      [app('Scrutiny / Re-scrutiny', { status: 'Returned' })],
      DEFAULT_WORKFLOW_CONFIG,
      now
    );
    expect(metrics.paused).toBe(1);
    expect(metrics.breached).toBe(0);
  });
});

describe('stage pendency', () => {
  it('counts active cases per operational stage and excludes terminal ones', () => {
    const applications = [
      app('Scrutiny / Re-scrutiny', { stageEnteredAt: daysAgo(30) }),
      app('Scrutiny / Re-scrutiny', { stageEnteredAt: daysAgo(10) }),
      app('Expert Visit Committee (EVC)'),
      app('Final Approval', { status: 'Approved' })
    ];

    const rows = stagePendency(applications, DEFAULT_WORKFLOW_CONFIG, now);
    const scrutiny = rows.find((row) => row.stage === 'Scrutiny / Re-scrutiny');
    const evc = rows.find((row) => row.stage === 'Expert Visit Committee (EVC)');
    const final = rows.find((row) => row.stage === 'Final Approval');

    expect(scrutiny).toMatchObject({ count: 2, share: 67, averageAgeDays: 20 });
    expect(evc).toMatchObject({ count: 1, share: 33 });
    expect(final?.count).toBe(0);
    expect(rows).toHaveLength(7);
  });
});

describe('ageing buckets', () => {
  it('places cases into the five documented bands', () => {
    const applications = [2, 10, 20, 40, 90].map((days) =>
      app('Scrutiny / Re-scrutiny', { stageEnteredAt: daysAgo(days) })
    );

    const buckets = ageingBuckets(applications, now);
    expect(buckets.map((bucket) => bucket.count)).toEqual([1, 1, 1, 1, 1]);
    expect(buckets.map((bucket) => bucket.share)).toEqual([20, 20, 20, 20, 20]);
  });

  it('ignores terminal applications', () => {
    const buckets = ageingBuckets([app('Final Approval', { status: 'Approved' })], now);
    expect(buckets.every((bucket) => bucket.count === 0)).toBe(true);
  });
});

describe('regional and officer breakdowns', () => {
  it('computes region shares from real records', () => {
    const rows = regionBreakdown([
      app('Scrutiny / Re-scrutiny', { region: 'Northern' }),
      app('Scrutiny / Re-scrutiny', { region: 'Northern' }),
      app('Scrutiny / Re-scrutiny', { region: 'Northern' }),
      app('Scrutiny / Re-scrutiny', { region: 'Southern' })
    ]);

    expect(rows).toEqual([
      { region: 'Northern', count: 3, share: 75 },
      { region: 'Southern', count: 1, share: 25 }
    ]);
  });

  it('counts active cases per region and stage', () => {
    const rows = regionStageMatrix([
      app('Scrutiny / Re-scrutiny', { region: 'Northern' }),
      app('Scrutiny / Re-scrutiny', { region: 'Northern' }),
      app('Expert Visit Committee (EVC)', { region: 'Southern' }),
      app('Final Approval', { region: 'Southern', status: 'Rejected' })
    ]);

    expect(rows.map((row) => row.region)).toEqual(['Northern', 'Southern']);
    expect(rows[0].total).toBe(2);
    expect(rows[0].counts['Scrutiny / Re-scrutiny']).toBe(2);
    expect(rows[1].total).toBe(1);
    expect(rows[1].counts['Expert Visit Committee (EVC)']).toBe(1);
    expect(rows[1].counts['Final Approval']).toBe(0);
  });

  it('groups active workload by assigned officer, last actor, or responsible role', () => {
    const rows = officerWorkload(
      [
        app('Scrutiny / Re-scrutiny', { assignedOfficerId: 'OFF-1' }),
        app('Scrutiny / Re-scrutiny', { assignedOfficerId: 'OFF-1' }),
        app('Expert Visit Committee (EVC)', { lastActionBy: 'OFF-2' }),
        app('Final Approval', {
          timeline: [
            {
              stage: 'Final Approval',
              date: '2026-02-10',
              status: 'current',
              officer: 'Member Secretary'
            }
          ]
        }),
        app('Final Approval', { status: 'Approved' })
      ],
      DEFAULT_WORKFLOW_CONFIG,
      now
    );

    expect(rows[0]).toMatchObject({ officer: 'OFF-1', count: 2 });
    expect(rows.map((row) => row.officer)).toEqual([
      'OFF-1',
      'OFF-2',
      'Member Secretary'
    ]);
    expect(rows.find((row) => row.officer === 'OFF-1')?.stages).toEqual([
      'Scrutiny / Re-scrutiny'
    ]);
  });

  it('ranks bottlenecks by breaches, due-soon load and average age', () => {
    const rows = stagePendency(
      [
        app('Scrutiny / Re-scrutiny', {
          stageEnteredAt: '2026-01-01',
          stageDueAt: '2026-01-20'
        }),
        app('Expert Visit Committee (EVC)', { stageEnteredAt: daysAgo(5) })
      ],
      DEFAULT_WORKFLOW_CONFIG,
      now
    );

    const ranked = bottleneckRanking(rows);
    expect(ranked[0].stage).toBe('Scrutiny / Re-scrutiny');
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });
});

function visit(overrides: Partial<EVCVisit> = {}): EVCVisit {
  return {
    id: 'EVC-TEST',
    applicationId: 'AICTE/2026/0001',
    instituteId: 'INST-101',
    instituteName: 'Test Institute',
    stateRegion: 'Delhi (Northern Region)',
    region: 'Northern',
    date: '2026-02-10',
    displayDate: { day: '10', month: 'Feb' },
    status: 'Scheduled',
    assignedCommittee: 'Committee North-A',
    committeeMembers: [],
    mode: 'Physical',
    reportSubmitted: false,
    ...overrides
  };
}

describe('EVC queue', () => {
  it('separates states and reports overdue inspection reports', () => {
    const summary = evcQueueSummary(
      [
        visit({ id: 'EVC-1', scheduledAt: '2026-02-10', reportDueAt: '2026-02-20' }),
        visit({ id: 'EVC-2', scheduledAt: '2026-03-05', reportDueAt: '2026-03-12' }),
        visit({ id: 'EVC-3', status: 'Pending', date: '2026-03-08' }),
        visit({ id: 'EVC-4', status: 'Completed', reportSubmitted: true }),
        visit({ id: 'EVC-5', status: 'Cancelled' })
      ],
      DEFAULT_WORKFLOW_CONFIG,
      now
    );

    expect(summary).toMatchObject({
      total: 5,
      scheduled: 2,
      pending: 1,
      completed: 1,
      cancelled: 1,
      reportOverdue: 1
    });
    expect(summary.upcoming.map((item) => item.id)).toEqual(['EVC-2', 'EVC-3']);
  });

  it('lists visits whose inspection date has passed without a report', () => {
    const rows = pendingReports(
      [
        visit({ id: 'PAST', date: '2026-02-10' }),
        visit({ id: 'FUTURE', date: '2026-03-08' }),
        visit({ id: 'DONE', date: '2026-02-01', status: 'Completed', reportSubmitted: true }),
        visit({ id: 'CANCELLED', status: 'Cancelled' })
      ],
      now
    );

    expect(rows.map((item) => item.id)).toEqual(['PAST']);
  });
});

describe('compliance snapshot', () => {
  it('reconciles overdue undertakings and expired documents', () => {
    const undertaking: Undertaking = {
      id: 'UND-1',
      applicationId: 'AICTE/2026/0001',
      instituteId: 'INST-101',
      instituteName: 'Test Institute',
      region: 'Northern',
      conditionCode: 'UND_LAND_CONVERSION',
      title: 'Land conversion',
      dueDate: '2026-01-10',
      evidenceDocumentIds: [],
      status: 'Pending',
      escalationLevel: 0
    };
    const document: DocumentItem = {
      id: 'DOC-1',
      title: 'Lease Deed',
      category: 'Land & Building',
      instituteName: 'Test Institute',
      instituteId: 'INST-101',
      region: 'Northern',
      uploadDate: '2024-01-01',
      expiryDate: '2026-01-15',
      status: 'Verified',
      fileSize: '1 MB',
      fileType: 'PDF'
    };

    const snapshot = complianceSnapshot(
      [undertaking],
      [document],
      DEFAULT_WORKFLOW_CONFIG,
      now
    );

    expect(snapshot.undertakings.overdue).toBe(1);
    expect(snapshot.documents.expired).toBe(1);
    expect(snapshot.documents.total).toBe(1);
  });
});

describe('alerts and activity', () => {
  const alert = (overrides: Partial<SystemAlert>): SystemAlert => ({
    id: 'ALT-1',
    rule: 'application.stage',
    entityType: 'Application',
    entityId: 'AICTE/2026/0001',
    tier: 'Breached',
    severity: 'high',
    dedupeKey: 'application.stage:AICTE/2026/0001:Breached',
    createdAt: '2026-02-20T10:00:00.000Z',
    status: 'Open',
    title: 'Stage breached',
    description: 'Case is overdue',
    ...overrides
  });

  it('summarises active and resolved alerts', () => {
    const summary = alertSummary([
      alert({ id: 'A', status: 'Open', severity: 'critical' }),
      alert({ id: 'B', status: 'Acknowledged', severity: 'high' }),
      alert({ id: 'C', status: 'Resolved' })
    ]);

    expect(summary).toEqual({
      open: 1,
      acknowledged: 1,
      resolved: 1,
      critical: 1,
      high: 1
    });
  });

  it('sorts active alerts newest first', () => {
    const sorted = activeAlerts([
      alert({ id: 'OLD', createdAt: '2026-01-01T00:00:00.000Z' }),
      alert({ id: 'NEW', createdAt: '2026-03-01T00:00:00.000Z' }),
      alert({ id: 'DONE', status: 'Resolved', createdAt: '2026-03-02T00:00:00.000Z' })
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['NEW', 'OLD']);
  });

  it('reports the latest application update', () => {
    const latest = latestUpdated([
      app('Scrutiny / Re-scrutiny', { lastUpdated: '21 Oct 2025' }),
      app('Final Approval', { lastUpdated: '30 Oct 2026' })
    ]);
    expect(latest?.startsWith('2026-10-30')).toBe(true);
  });
});

describe('case detail helpers', () => {
  it('maps timeline events to labelled progress steps', () => {
    const application = app('Expert Visit Committee (EVC)', {
      timeline: [
        { stage: 'Submitted', date: '01 Jan 2026', status: 'completed' },
        { stage: 'Expert Visit Committee (EVC)', date: '10 Feb 2026', status: 'current' }
      ]
    });

    expect(applicationProgress(application)).toEqual([
      { stage: 'Submitted', title: 'Submitted', date: '01 Jan 2026', status: 'completed', note: undefined },
      {
        stage: 'Scrutiny / Re-scrutiny',
        title: 'Scrutiny / Re-scrutiny',
        date: 'Pending',
        status: 'pending',
        note: undefined
      },
      {
        stage: 'Expert Visit Committee (EVC)',
        title: 'Expert Visit Committee (EVC)',
        date: '10 Feb 2026',
        status: 'current',
        note: undefined
      },
      {
        stage: 'Approval (Subject to Undertaking)',
        title: 'Approval (Subject to Undertaking)',
        date: 'Pending',
        status: 'pending',
        note: undefined
      },
      {
        stage: 'Final Approval',
        title: 'Final Approval',
        date: 'Pending',
        status: 'pending',
        note: undefined
      }
    ]);
  });

  it('links a visit by id or application id', () => {
    const application = app('Expert Visit Committee (EVC)', { id: 'AICTE/2026/0099' });
    const byApp = visit({ id: 'EVC-99', applicationId: 'AICTE/2026/0099' });
    const byId = visit({ id: 'EVC-LINK', applicationId: 'AICTE/2026/0000' });

    expect(linkedVisitFor(application, [byApp])?.id).toBe('EVC-99');
    expect(
      linkedVisitFor({ ...application, evcVisitId: 'EVC-LINK' }, [byApp, byId])?.id
    ).toBe('EVC-LINK');
    expect(linkedVisitFor(application, [])).toBeUndefined();
  });
});
