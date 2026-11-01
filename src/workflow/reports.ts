import type { Application, DocumentItem, EVCVisit, Region, Undertaking } from '../types';
import type { WorkflowConfig } from './types';
import { DEFAULT_WORKFLOW_CONFIG } from './config';
import { getNow, parseDate, toIsoDate } from '../utils/dates';
import {
  REGION_ORDER,
  applicationAgeDays,
  isTerminalApplication,
  officerForApplication,
  pipelineMetrics,
  stagePendency
} from './selectors';
import { applicationOverdueWindow, evcReportWindow } from './sla';
import { documentValidity, isActiveDocument, validityLabel } from './documents';
import { undertakingBucket } from './undertakings';

export type ReportKind =
  | 'pendency'
  | 'evc'
  | 'undertakings'
  | 'documents'
  | 'overdue'
  | 'regions';

export interface ReportColumn {
  key: string;
  label: string;
}

export type ReportCell = string | number | boolean | null;

export type ReportRow = Record<string, ReportCell>;

export interface ReportTable {
  columns: ReportColumn[];
  rows: ReportRow[];
}

export interface ReportDefinition {
  kind: ReportKind;
  title: string;
  description: string;
  filename: string;
}

export interface ReportContext {
  applications: Application[];
  visits: EVCVisit[];
  undertakings: Undertaking[];
  documents: DocumentItem[];
  config?: WorkflowConfig;
  now?: Date;
}

export const REPORT_CATALOG: ReportDefinition[] = [
  {
    kind: 'pendency',
    title: 'Stage pendency',
    description: 'Active applications per stage with breaches, due-soon load, average age and target days.',
    filename: 'aicte-stage-pendency'
  },
  {
    kind: 'evc',
    title: 'EVC inspection status',
    description: 'Every expert visit with committee, mode, report state and overdue days.',
    filename: 'aicte-evc-status'
  },
  {
    kind: 'undertakings',
    title: 'Undertaking compliance',
    description: 'Conditions attached to approvals with due dates, evidence and verification state.',
    filename: 'aicte-undertakings'
  },
  {
    kind: 'documents',
    title: 'Document validity',
    description: 'Active land, fire, affiliation and finance records with expiry tier and days left.',
    filename: 'aicte-document-validity'
  },
  {
    kind: 'overdue',
    title: 'Overdue register',
    description: 'Applications past their stage due date, with owner, age and overdue days.',
    filename: 'aicte-overdue-register'
  },
  {
    kind: 'regions',
    title: 'Regional performance',
    description: 'Per-region active, approved, rejected and breached counts for the current scope.',
    filename: 'aicte-regional-performance'
  }
];

export function buildReport(kind: ReportKind, context: ReportContext): ReportTable {
  const config = context.config ?? DEFAULT_WORKFLOW_CONFIG;
  const now = context.now ?? getNow();

  switch (kind) {
    case 'pendency':
      return pendencyReport(context.applications, config, now);
    case 'evc':
      return evcReport(context.visits, config, now);
    case 'undertakings':
      return undertakingReport(context.undertakings, config, now);
    case 'documents':
      return documentReport(context.documents, config, now);
    case 'overdue':
      return overdueReport(context.applications, config, now);
    case 'regions':
      return regionReport(context.applications, config, now);
  }
}

function pendencyReport(
  applications: Application[],
  config: WorkflowConfig,
  now: Date
): ReportTable {
  const rows = stagePendency(applications, config, now).map((row) => ({
    stage: row.label,
    active: row.count,
    sharePercent: row.share,
    breached: row.breached,
    dueSoon: row.dueSoon,
    averageAgeDays: row.averageAgeDays,
    targetDays: row.slaDays
  }));

  return {
    columns: [
      { key: 'stage', label: 'Stage' },
      { key: 'active', label: 'Active applications' },
      { key: 'sharePercent', label: 'Share of active (%)' },
      { key: 'breached', label: 'SLA breached' },
      { key: 'dueSoon', label: 'Due soon' },
      { key: 'averageAgeDays', label: 'Average age (days)' },
      { key: 'targetDays', label: 'Target days' }
    ],
    rows
  };
}

function evcReport(visits: EVCVisit[], config: WorkflowConfig, now: Date): ReportTable {
  const rows = [...visits]
    .sort((a, b) => {
      const left = parseDate(a.scheduledAt ?? a.date)?.getTime() ?? 0;
      const right = parseDate(b.scheduledAt ?? b.date)?.getTime() ?? 0;
      return right - left;
    })
    .map((visit) => {
      const overdue =
        !visit.reportSubmitted &&
        evcReportWindow(visit, now, config.evcReportSlaDays, config.businessDaysOnly).tier ===
          'Breached';
      const reportState = visit.reportSubmitted
        ? 'Submitted'
        : overdue
          ? 'Overdue'
          : visit.status === 'Cancelled'
            ? 'Cancelled'
            : 'Pending';
      return {
        visitId: visit.id,
        applicationId: visit.applicationId ?? '',
        institute: visit.instituteName,
        region: visit.region,
        scheduledDate: visit.scheduledAt ?? visit.date,
        status: visit.status,
        committee: visit.assignedCommittee,
        mode: visit.mode,
        reportSubmitted: visit.reportSubmitted ? 'Yes' : 'No',
        reportDue: visit.reportDueAt ?? '',
        reportState
      };
    });

  return {
    columns: [
      { key: 'visitId', label: 'Visit ID' },
      { key: 'applicationId', label: 'Application ID' },
      { key: 'institute', label: 'Institution' },
      { key: 'region', label: 'Region' },
      { key: 'scheduledDate', label: 'Scheduled date' },
      { key: 'status', label: 'Visit status' },
      { key: 'committee', label: 'Committee' },
      { key: 'mode', label: 'Mode' },
      { key: 'reportSubmitted', label: 'Report submitted' },
      { key: 'reportDue', label: 'Report due' },
      { key: 'reportState', label: 'Report state' }
    ],
    rows
  };
}

function undertakingReport(
  undertakings: Undertaking[],
  config: WorkflowConfig,
  now: Date
): ReportTable {
  const order = { Overdue: 0, Pending: 1, Submitted: 2, Rejected: 3, Verified: 4 };

  const rows = [...undertakings]
    .sort((a, b) => {
      const left = order[undertakingBucket(a, now)];
      const right = order[undertakingBucket(b, now)];
      return left - right || (parseDate(a.dueDate)?.getTime() ?? 0) - (parseDate(b.dueDate)?.getTime() ?? 0);
    })
    .map((undertaking) => ({
      id: undertaking.id,
      applicationId: undertaking.applicationId,
      institute: undertaking.instituteName,
      region: undertaking.region,
      conditionCode: undertaking.conditionCode,
      condition: undertaking.title,
      dueDate: undertaking.dueDate,
      state: undertakingBucket(undertaking, now),
      escalationLevel: undertaking.escalationLevel,
      evidenceCount: undertaking.evidenceDocumentIds.length,
      verifiedBy: undertaking.verifiedBy ?? ''
    }));

  return {
    columns: [
      { key: 'id', label: 'Undertaking ID' },
      { key: 'applicationId', label: 'Application ID' },
      { key: 'institute', label: 'Institution' },
      { key: 'region', label: 'Region' },
      { key: 'conditionCode', label: 'Condition code' },
      { key: 'condition', label: 'Condition' },
      { key: 'dueDate', label: 'Due date' },
      { key: 'state', label: 'State' },
      { key: 'escalationLevel', label: 'Escalation level' },
      { key: 'evidenceCount', label: 'Evidence files' },
      { key: 'verifiedBy', label: 'Verified by' }
    ],
    rows
  };
}

function documentReport(
  documents: DocumentItem[],
  config: WorkflowConfig,
  now: Date
): ReportTable {
  const tierOrder = { Expired: 0, Critical: 1, 'Expiring Soon': 2, Valid: 3 };

  const rows = documents
    .filter(isActiveDocument)
    .map((document) => {
      const validity = documentValidity(document, config.documentWarningDays, now);
      return { document, validity };
    })
    .sort((a, b) => {
      const left = tierOrder[a.validity.tier] ?? 4;
      const right = tierOrder[b.validity.tier] ?? 4;
      return left - right || a.validity.daysLeft - b.validity.daysLeft;
    })
    .map(({ document, validity }) => ({
      id: document.id,
      title: document.title,
      category: document.category,
      institute: document.instituteName,
      region: document.region,
      uploadedOn: document.uploadDate,
      expiryDate: document.expiryDate ?? '',
      state: validity.tier,
      daysLeft: Number.isFinite(validity.daysLeft) ? validity.daysLeft : '',
      note: validityLabel(validity),
      verifiedBy: document.verifiedBy ?? ''
    }));

  return {
    columns: [
      { key: 'id', label: 'Document ID' },
      { key: 'title', label: 'Document' },
      { key: 'category', label: 'Category' },
      { key: 'institute', label: 'Institution' },
      { key: 'region', label: 'Region' },
      { key: 'uploadedOn', label: 'Uploaded on' },
      { key: 'expiryDate', label: 'Expiry date' },
      { key: 'state', label: 'Validity tier' },
      { key: 'daysLeft', label: 'Days left' },
      { key: 'note', label: 'Validity note' },
      { key: 'verifiedBy', label: 'Verified by' }
    ],
    rows
  };
}

function overdueReport(
  applications: Application[],
  config: WorkflowConfig,
  now: Date
): ReportTable {
  const rows = applications
    .filter((app) => !isTerminalApplication(app))
    .map((app) => ({ app, window: applicationOverdueWindow(app, config, now) }))
    .filter(({ window }) => window.daysOverdue > 0)
    .sort((a, b) => b.window.daysOverdue - a.window.daysOverdue)
    .map(({ app, window }) => ({
      applicationId: app.id,
      institute: app.instituteName,
      region: app.region,
      stage: app.stage,
      status: app.status,
      stageEnteredAt: app.stageEnteredAt ?? '',
      stageDueAt: window.dueAt ?? app.stageDueAt ?? '',
      daysOverdue: window.daysOverdue,
      ageInStageDays: applicationAgeDays(app, now),
      owner: officerForApplication(app),
      pendingDeficiencies: (app.deficiencies ?? []).filter((item) => !item.resolvedAt).length
    }));

  return {
    columns: [
      { key: 'applicationId', label: 'Application ID' },
      { key: 'institute', label: 'Institution' },
      { key: 'region', label: 'Region' },
      { key: 'stage', label: 'Current stage' },
      { key: 'status', label: 'Status' },
      { key: 'stageEnteredAt', label: 'Entered stage on' },
      { key: 'stageDueAt', label: 'Stage due' },
      { key: 'daysOverdue', label: 'Days overdue' },
      { key: 'ageInStageDays', label: 'Age in stage (days)' },
      { key: 'owner', label: 'Accountable officer or committee' },
      { key: 'pendingDeficiencies', label: 'Open deficiencies' }
    ],
    rows
  };
}

function regionReport(
  applications: Application[],
  config: WorkflowConfig,
  now: Date
): ReportTable {
  const totalActive = applications.filter((app) => !isTerminalApplication(app)).length;

  const rows = REGION_ORDER.flatMap((region: Region) => {
    const regional = applications.filter((app) => app.region === region);
    if (regional.length === 0) return [];
    const metrics = pipelineMetrics(regional, config, now);
    const active = totalActive === 0 ? 0 : Math.round((metrics.pending / totalActive) * 100);
    return [
      {
        region,
        total: metrics.total,
        active: metrics.pending,
        shareOfActivePercent: active,
        approved: metrics.approved,
        rejected: metrics.rejected,
        breached: metrics.breached,
        dueToday: metrics.dueToday,
        approaching: metrics.approaching,
        actionRequired: metrics.actionRequired
      }
    ];
  });

  return {
    columns: [
      { key: 'region', label: 'Region' },
      { key: 'total', label: 'Applications' },
      { key: 'active', label: 'Active' },
      { key: 'shareOfActivePercent', label: 'Share of active (%)' },
      { key: 'approved', label: 'Approved' },
      { key: 'rejected', label: 'Rejected' },
      { key: 'breached', label: 'SLA breached' },
      { key: 'dueToday', label: 'Due today' },
      { key: 'approaching', label: 'Approaching' },
      { key: 'actionRequired', label: 'Action required' }
    ],
    rows
  };
}

export function reportFilename(definition: ReportDefinition, region: string, now: Date = getNow()): string {
  const scope = region === 'All' ? 'national' : region.toLowerCase().replace(/\s+/g, '-');
  return `${definition.filename}-${scope}-${toIsoDate(now)}.csv`;
}
