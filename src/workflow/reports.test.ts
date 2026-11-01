import { describe, expect, it } from 'vitest';
import type { DocumentItem, EVCVisit, Undertaking } from '../types';
import {
  REPORT_CATALOG,
  buildReport,
  reportFilename,
  type ReportContext
} from './reports';
import { DEFAULT_WORKFLOW_CONFIG } from './config';
import { OPERATIONAL_STAGES } from './stages';
import { makeApplication } from './__tests__/fixtures';

const now = new Date(2026, 2, 1);

function baseContext(overrides: Partial<ReportContext> = {}): ReportContext {
  return {
    applications: [],
    visits: [],
    undertakings: [],
    documents: [],
    config: DEFAULT_WORKFLOW_CONFIG,
    now,
    ...overrides
  };
}

function visit(overrides: Partial<EVCVisit> = {}): EVCVisit {
  return {
    id: 'EVC-1',
    applicationId: 'AICTE/2026/0001',
    instituteId: 'INST-101',
    instituteName: 'Test Institute of Technology',
    stateRegion: 'Delhi (Northern Region)',
    region: 'Northern',
    date: '2026-02-10',
    displayDate: { day: '10', month: 'Feb' },
    status: 'Scheduled',
    assignedCommittee: 'Committee North-A',
    committeeMembers: [],
    mode: 'Physical',
    reportSubmitted: false,
    scheduledAt: '2026-02-10',
    reportDueAt: '2026-02-17',
    ...overrides
  };
}

function undertaking(overrides: Partial<Undertaking> = {}): Undertaking {
  return {
    id: 'UND-1',
    applicationId: 'AICTE/2026/0001',
    instituteId: 'INST-101',
    instituteName: 'Test Institute of Technology',
    region: 'Northern',
    conditionCode: 'UND_LAND_CONVERSION',
    title: 'Land conversion',
    dueDate: '2026-01-10',
    evidenceDocumentIds: ['DOC-9'],
    status: 'Pending',
    escalationLevel: 1,
    ...overrides
  };
}

function document(overrides: Partial<DocumentItem> = {}): DocumentItem {
  return {
    id: 'DOC-1',
    title: 'Registered land lease deed',
    category: 'Land & Building',
    instituteName: 'Test Institute of Technology',
    instituteId: 'INST-101',
    region: 'Northern',
    uploadDate: '2024-01-01',
    expiryDate: '2026-01-15',
    status: 'Verified',
    fileSize: '1 MB',
    fileType: 'PDF',
    ...overrides
  };
}

const applications = [
  makeApplication({
    id: 'AICTE/2026/0001',
    region: 'Northern',
    stage: 'Scrutiny / Re-scrutiny',
    stageEnteredAt: '2026-01-01',
    stageDueAt: '2026-01-20'
  }),
  makeApplication({
    id: 'AICTE/2026/0002',
    region: 'Northern',
    stage: 'Expert Visit Committee (EVC)',
    stageEnteredAt: '2026-02-20',
    stageDueAt: '2026-12-31'
  }),
  makeApplication({
    id: 'AICTE/2026/0003',
    region: 'Southern',
    stage: 'Final Approval',
    status: 'Approved',
    stageEnteredAt: '2026-02-01',
    stageDueAt: '2026-12-31'
  }),
  makeApplication({
    id: 'AICTE/2026/0004',
    region: 'Southern',
    stage: 'Final Approval',
    status: 'Rejected',
    stageEnteredAt: '2026-02-01',
    stageDueAt: '2026-12-31'
  })
];

describe('report catalogue', () => {
  it('exposes six reports with unique kinds and filenames', () => {
    expect(REPORT_CATALOG).toHaveLength(6);
    expect(new Set(REPORT_CATALOG.map((item) => item.kind)).size).toBe(6);
    expect(new Set(REPORT_CATALOG.map((item) => item.filename)).size).toBe(6);
  });

  it('builds every catalogue report without throwing on an empty dataset', () => {
    for (const definition of REPORT_CATALOG) {
      const table = buildReport(definition.kind, baseContext());
      expect(table.columns.length).toBeGreaterThan(0);
      expect(Array.isArray(table.rows)).toBe(true);
    }
  });
});

describe('stage pendency report', () => {
  it('matches the operational stage table and reconciles active counts', () => {
    const table = buildReport('pendency', baseContext({ applications }));

    expect(table.rows).toHaveLength(OPERATIONAL_STAGES.length);
    const active = table.rows.reduce((sum, row) => sum + Number(row.active), 0);
    expect(active).toBe(2);
    expect(table.rows[0].stage).toBeTruthy();
    expect(table.columns.map((column) => column.key)).toContain('targetDays');
  });
});

describe('EVC inspection report', () => {
  it('labels report state and orders visits newest first', () => {
    const table = buildReport(
      'evc',
      baseContext({
        visits: [
          visit({ id: 'OLD', scheduledAt: '2026-01-05', reportDueAt: '2026-01-12' }),
          visit({ id: 'NEW', scheduledAt: '2026-02-25', reportDueAt: '2026-03-10' }),
          visit({ id: 'DONE', scheduledAt: '2026-02-01', reportSubmitted: true }),
          visit({ id: 'CANCELLED', status: 'Cancelled', scheduledAt: '2026-01-20' })
        ]
      })
    );

    expect(table.rows.map((row) => row.visitId)).toEqual(['NEW', 'DONE', 'CANCELLED', 'OLD']);
    const byId = new Map(table.rows.map((row) => [row.visitId, row]));
    expect(byId.get('OLD')?.reportState).toBe('Overdue');
    expect(byId.get('DONE')?.reportState).toBe('Submitted');
    expect(byId.get('CANCELLED')?.reportState).toBe('Cancelled');
    expect(byId.get('NEW')?.reportState).toBe('Pending');
  });
});

describe('undertaking report', () => {
  it('orders overdue conditions before verified ones and keeps evidence counts', () => {
    const table = buildReport(
      'undertakings',
      baseContext({
        undertakings: [
          undertaking({ id: 'VERIFIED', status: 'Verified', verifiedBy: 'Registrar' }),
          undertaking({ id: 'OVERDUE', status: 'Overdue' }),
          undertaking({ id: 'PENDING', dueDate: '2026-12-01', status: 'Pending' })
        ]
      })
    );

    expect(table.rows.map((row) => row.id)).toEqual(['OVERDUE', 'PENDING', 'VERIFIED']);
    expect(table.rows[0].evidenceCount).toBe(1);
    expect(table.rows[2].verifiedBy).toBe('Registrar');
  });
});

describe('document validity report', () => {
  it('drops superseded files and sorts by expiry severity', () => {
    const table = buildReport(
      'documents',
      baseContext({
        documents: [
          document({ id: 'VALID', expiryDate: '2026-12-31' }),
          document({ id: 'EXPIRED', expiryDate: '2026-01-15' }),
          document({ id: 'GONE', status: 'Superseded' })
        ]
      })
    );

    expect(table.rows.map((row) => row.id)).toEqual(['EXPIRED', 'VALID']);
    expect(table.rows[0].state).toBe('Expired');
    expect(table.rows[0].daysLeft).toBeLessThan(0);
    expect(table.rows[1].state).toBe('Valid');
  });
});

describe('overdue register', () => {
  it('keeps only active cases past their stage due date, worst first', () => {
    const table = buildReport(
      'overdue',
      baseContext({
        applications: [
          ...applications,
          makeApplication({
            id: 'AICTE/2026/0005',
            stage: 'Scrutiny / Re-scrutiny',
            stageEnteredAt: '2026-01-01',
            stageDueAt: '2026-02-01'
          })
        ]
      })
    );

    expect(table.rows.map((row) => row.applicationId)).toEqual([
      'AICTE/2026/0001',
      'AICTE/2026/0005'
    ]);
    expect(table.rows[0].daysOverdue).toBe(40);
    expect(table.rows[1].daysOverdue).toBe(28);
    expect(table.rows.every((row) => row.status !== 'Approved' && row.status !== 'Rejected')).toBe(
      true
    );
  });
});

describe('regional performance report', () => {
  it('summarises each region that has records, in canonical order', () => {
    const table = buildReport('regions', baseContext({ applications }));

    expect(table.rows.map((row) => row.region)).toEqual(['Northern', 'Southern']);
    expect(table.rows[0]).toMatchObject({ total: 2, active: 2, approved: 0 });
    expect(table.rows[1]).toMatchObject({ total: 2, active: 0, approved: 1, rejected: 1 });
    expect(table.rows.reduce((sum, row) => sum + Number(row.total), 0)).toBe(applications.length);
  });
});

describe('report filenames', () => {
  it('names the scope and export date', () => {
    const definition = REPORT_CATALOG[0];
    expect(reportFilename(definition, 'All', now)).toBe(
      `${definition.filename}-national-2026-03-01.csv`
    );
    expect(reportFilename(definition, 'North Eastern', now)).toBe(
      `${definition.filename}-north-eastern-2026-03-01.csv`
    );
  });
});
