import { describe, expect, it } from 'vitest';
import { sweepDeadlines } from './alerts';
import type { SweepInput } from './alerts';
import { DEFAULT_WORKFLOW_CONFIG } from './config';
import { makeApplication } from './__tests__/fixtures';

function input(overrides: Partial<SweepInput> = {}): SweepInput {
  return {
    applications: [],
    evcVisits: [],
    undertakings: [],
    documents: [],
    alerts: [],
    escalations: [],
    config: DEFAULT_WORKFLOW_CONFIG,
    now: new Date(2026, 1, 20),
    ...overrides
  };
}

function breachedApp(overrides = {}) {
  return makeApplication({
    stageEnteredAt: '2026-01-01',
    stageDueAt: '2026-01-31',
    ...overrides
  });
}

describe('deadline sweep', () => {
  it('raises an alert and a level-3 escalation for a long overdue application', () => {
    const result = sweepDeadlines(input({ applications: [breachedApp()] }));

    expect(result.createdAlerts).toHaveLength(1);
    expect(result.createdAlerts[0]).toMatchObject({
      rule: 'application.stage',
      entityType: 'Application',
      tier: 'Breached',
      severity: 'critical',
      status: 'Open'
    });
    expect(result.createdEscalations).toHaveLength(1);
    expect(result.createdEscalations[0]).toMatchObject({
      level: 3,
      urgency: 'Critical',
      status: 'Open',
      raisedBy: 'Automated SLA Monitor'
    });
    expect(result.createdEscalations[0].slaBreachDays).toBe(20);
    expect(result.events.map((event) => event.type)).toEqual(
      expect.arrayContaining(['application.deadline_breached', 'escalation.raised'])
    );
    expect(result.applications[0].slaTier).toBe('Breached');
  });

  it('is idempotent when swept twice with the same clock', () => {
    const first = sweepDeadlines(input({ applications: [breachedApp()] }));
    const second = sweepDeadlines(
      input({ applications: first.applications, alerts: first.alerts, escalations: first.escalations })
    );

    expect(second.createdAlerts).toHaveLength(0);
    expect(second.createdEscalations).toHaveLength(0);
    expect(second.alerts).toHaveLength(first.alerts.length);
    expect(second.escalations).toHaveLength(first.escalations.length);
  });

  it('records a new alert when the tier advances', () => {
    const approaching = sweepDeadlines(
      input({ applications: [breachedApp()], now: new Date(2026, 0, 25) })
    );
    expect(approaching.createdAlerts[0].tier).toBe('Approaching');
    expect(approaching.createdEscalations).toHaveLength(0);

    const breached = sweepDeadlines(
      input({
        applications: approaching.applications,
        alerts: approaching.alerts,
        escalations: approaching.escalations
      })
    );
    expect(breached.createdAlerts[0].tier).toBe('Breached');
    expect(breached.alerts).toHaveLength(2);
    expect(breached.alerts.filter((alert) => alert.status !== 'Resolved')).toHaveLength(1);
    expect(breached.resolvedAlerts[0].tier).toBe('Approaching');
  });

  it('auto-resolves alerts when the underlying condition clears', () => {
    const first = sweepDeadlines(input({ applications: [breachedApp()] }));
    expect(first.createdAlerts).toHaveLength(1);

    const cleared = sweepDeadlines(
      input({
        applications: first.applications.map((app) => ({ ...app, status: 'Approved' as const })),
        alerts: first.alerts,
        escalations: first.escalations
      })
    );

    expect(cleared.createdAlerts).toHaveLength(0);
    expect(cleared.resolvedAlerts).toHaveLength(1);
    expect(cleared.alerts[0].status).toBe('Resolved');
  });

  it('upgrades an open escalation monotonically instead of duplicating it', () => {
    const level1 = sweepDeadlines(
      input({ applications: [breachedApp()], now: new Date(2026, 1, 4) })
    );
    expect(level1.createdEscalations[0].level).toBe(1);

    const level2 = sweepDeadlines(
      input({
        applications: level1.applications,
        alerts: level1.alerts,
        escalations: level1.escalations,
        now: new Date(2026, 1, 8)
      })
    );
    expect(level2.createdEscalations).toHaveLength(1);
    expect(level2.createdEscalations[0].level).toBe(2);
    expect(level2.escalations.filter((item) => item.status === 'Open')).toHaveLength(1);
    expect(level2.resolvedEscalations).toHaveLength(1);
  });

  it('auto-resolves its own escalation when the underlying breach clears', () => {
    const first = sweepDeadlines(input({ applications: [breachedApp()] }));
    const cleared = sweepDeadlines(
      input({
        applications: first.applications.map((app) => ({ ...app, status: 'Approved' as const })),
        alerts: first.alerts,
        escalations: first.escalations
      })
    );

    expect(cleared.resolvedEscalations).toHaveLength(1);
    expect(cleared.escalations[0].status).toBe('Resolved');
    expect(cleared.events.some((event) => event.type === 'escalation.resolved')).toBe(true);
  });

  it('leaves manually raised escalations untouched', () => {
    const result = sweepDeadlines(
      input({
        escalations: [
          {
            id: 'ESC-MANUAL',
            applicationId: 'AICTE/2026/0001',
            instituteName: 'Test Institute',
            region: 'Northern',
            raisedBy: 'Dr. R. K. Sharma (RO)',
            raisedDate: '10 Jan 2026',
            urgency: 'High',
            reason: 'Land title dispute under legal review.',
            status: 'Open'
          }
        ]
      })
    );

    expect(result.resolvedEscalations).toHaveLength(0);
    expect(result.escalations[0].status).toBe('Open');
  });

  it('alerts on expiring documents without escalating them', () => {
    const result = sweepDeadlines(
      input({
        documents: [
          {
            id: 'DOC-1',
            title: 'Lease Deed',
            category: 'Land & Building',
            instituteName: 'Test Institute',
            instituteId: 'INST-101',
            region: 'Northern',
            uploadDate: '2024-01-01',
            expiryDate: '2026-02-27',
            status: 'Verified',
            fileSize: '1.2 MB',
            fileType: 'PDF'
          }
        ],
        now: new Date(2026, 1, 20)
      })
    );

    expect(result.createdAlerts).toHaveLength(1);
    expect(result.createdAlerts[0]).toMatchObject({
      rule: 'document.expiry',
      tier: 'Critical',
      targetRoles: expect.arrayContaining(['INSTITUTION_ADMIN', 'REGIONAL_OFFICER', 'AICTE_ADMIN'])
    });
    expect(result.createdEscalations).toHaveLength(0);
  });

  it('targets undertaking alerts at the institution, regional officer and admin', () => {
    const result = sweepDeadlines(
      input({
        undertakings: [
          {
            id: 'UND-1',
            applicationId: 'AICTE/2026/0001',
            instituteId: 'INST-101',
            instituteName: 'Test Institute',
            region: 'Northern',
            conditionCode: 'FACULTY_RATIO',
            title: 'Faculty ratio evidence',
            dueDate: '2026-01-05',
            evidenceDocumentIds: [],
            status: 'Pending',
            escalationLevel: 0
          }
        ],
        now: new Date(2026, 0, 15)
      })
    );

    expect(result.createdAlerts).toHaveLength(1);
    expect(result.createdAlerts[0]).toMatchObject({
      rule: 'undertaking.due',
      tier: 'Overdue',
      targetRoles: expect.arrayContaining(['INSTITUTION_ADMIN', 'REGIONAL_OFFICER', 'AICTE_ADMIN'])
    });
  });
});
