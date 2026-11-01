import { describe, expect, it } from 'vitest';
import {
  applicationSla,
  documentExpiry,
  evcReportWindow,
  stageWindow,
  undertakingDueWindow
} from './sla';
import { DEFAULT_WORKFLOW_CONFIG } from './config';
import { makeApplication } from './__tests__/fixtures';
import type { EVCVisit, Undertaking } from '../types';

describe('SLA windows', () => {
  it('computes a 30-day scrutiny deadline from the entry date', () => {
    const window = stageWindow('Scrutiny / Re-scrutiny', DEFAULT_WORKFLOW_CONFIG, '2026-01-01');
    expect(window.dueAt).toBe('2026-01-31');
    expect(window.slaDays).toBe(30);
  });

  it('skips weekends in business-day mode', () => {
    const config = { ...DEFAULT_WORKFLOW_CONFIG, businessDaysOnly: true };
    const window = stageWindow('Scrutiny / Re-scrutiny', { ...config, stageSlas: { ...config.stageSlas, 'Scrutiny / Re-scrutiny': { days: 5, approachingPct: 80 } } }, '2026-01-02');
    expect(window.dueAt).toBe('2026-01-09');
  });

  it('tiers an application as approaching then breached', () => {
    const app = makeApplication({ stageEnteredAt: '2026-01-01', stageDueAt: '2026-01-31' });
    expect(applicationSla(app, DEFAULT_WORKFLOW_CONFIG, new Date(2026, 0, 25)).tier).toBe('Approaching');
    expect(applicationSla(app, DEFAULT_WORKFLOW_CONFIG, new Date(2026, 0, 31)).tier).toBe('Due Today');
    expect(applicationSla(app, DEFAULT_WORKFLOW_CONFIG, new Date(2026, 1, 1)).tier).toBe('Breached');
  });

  it('pauses the clock while a case is returned', () => {
    const app = makeApplication({ status: 'Returned', stageEnteredAt: '2026-01-01', stageDueAt: '2026-01-31' });
    expect(applicationSla(app, DEFAULT_WORKFLOW_CONFIG, new Date(2026, 1, 10)).tier).toBe('Paused');
  });

  it('reports EVC report overdue only until the report is submitted', () => {
    const visit: EVCVisit = {
      id: 'EVC-1',
      applicationId: 'AICTE/2026/0001',
      instituteId: 'INST-101',
      instituteName: 'Test Institute',
      stateRegion: 'Delhi',
      region: 'Northern',
      date: '2026-01-10',
      displayDate: { day: '10', month: 'Jan' },
      status: 'Scheduled',
      assignedCommittee: 'EVC-1',
      committeeMembers: [],
      mode: 'Physical',
      scheduledAt: '2026-01-10',
      reportDueAt: '2026-01-17'
    };
    expect(evcReportWindow(visit, new Date(2026, 0, 20)).daysOverdue).toBe(3);
    expect(evcReportWindow({ ...visit, reportSubmitted: true }, new Date(2026, 0, 20)).daysOverdue).toBe(0);
    expect(evcReportWindow({ ...visit, status: 'Cancelled' }, new Date(2026, 0, 20)).tier).toBe('On Track');
  });

  it('derives the report deadline for legacy visits without an explicit due date', () => {
    const legacy: EVCVisit = {
      id: 'EVC-LEGACY',
      applicationId: 'AICTE/2026/0001',
      instituteId: 'INST-101',
      instituteName: 'Test Institute',
      stateRegion: 'Delhi',
      region: 'Northern',
      date: '05 Jan 2026',
      displayDate: { day: '05', month: 'Jan' },
      status: 'Scheduled',
      assignedCommittee: 'EVC-1',
      committeeMembers: [],
      mode: 'Physical'
    };
    const window = evcReportWindow(legacy, new Date(2026, 0, 20));
    expect(window.dueAt).toBe('2026-01-12');
    expect(window.tier).toBe('Breached');
    expect(window.daysOverdue).toBe(8);
  });

  it('flags undertakings past their evidence deadline', () => {
    const undertaking: Undertaking = {
      id: 'UND-1',
      applicationId: 'AICTE/2026/0001',
      instituteId: 'INST-101',
      instituteName: 'Test Institute',
      region: 'Northern',
      conditionCode: 'LAND_UNDERTAKING',
      title: 'Submit land conversion undertaking',
      dueDate: '2026-01-10',
      evidenceDocumentIds: [],
      status: 'Pending',
      escalationLevel: 0
    };
    expect(undertakingDueWindow(undertaking, new Date(2026, 0, 15)).daysOverdue).toBe(5);
    expect(
      undertakingDueWindow({ ...undertaking, status: 'Verified' }, new Date(2026, 0, 15))
        .tier
    ).toBe('On Track');
  });
});

describe('document expiry tiers', () => {
  const warnings = [60, 30, 7];

  it('grades validity from early warning to expiry', () => {
    expect(documentExpiry({ expiryDate: '2027-06-30' }, warnings, new Date(2026, 0, 1)).tier).toBe('Valid');
    expect(documentExpiry({ expiryDate: '2026-03-01' }, warnings, new Date(2026, 0, 20)).tier).toBe('Expiring Soon');
    expect(documentExpiry({ expiryDate: '2026-02-10' }, warnings, new Date(2026, 0, 20)).tier).toBe('Critical');
    expect(documentExpiry({ expiryDate: '2026-01-10' }, warnings, new Date(2026, 0, 20)).tier).toBe('Expired');
  });
});
