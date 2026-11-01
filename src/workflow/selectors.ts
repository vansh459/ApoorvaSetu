import type {
  Application,
  ApplicationStage,
  DocumentItem,
  EVCVisit,
  Region,
  SystemAlert,
  Undertaking
} from '../types';
import type { WorkflowConfig } from './types';
import { DEFAULT_WORKFLOW_CONFIG } from './config';
import { OPERATIONAL_STAGES, STAGE_META, canonicalStage } from './stages';
import { applicationOverdueWindow, evcReportWindow } from './sla';
import { summariseDocuments } from './documents';
import { summariseUndertakings } from './undertakings';
import { differenceInCalendarDays, getNow, parseDate, toIsoDate } from '../utils/dates';

export const REGION_ORDER: Region[] = [
  'Northern',
  'Southern',
  'Eastern',
  'Western',
  'Central',
  'North Eastern',
  'Others'
];

export function isTerminalApplication(app: Application): boolean {
  return app.status === 'Approved' || app.status === 'Rejected';
}

export function currentTimelineEvent(app: Application) {
  return [...app.timeline].reverse().find((event) => event.status === 'current');
}

export function applicationStageDate(app: Application): Date | null {
  return (
    parseDate(app.stageEnteredAt) ??
    parseDate(currentTimelineEvent(app)?.enteredAt) ??
    parseDate(currentTimelineEvent(app)?.date) ??
    parseDate(app.lastUpdated) ??
    parseDate(app.appliedDate)
  );
}

export function applicationAgeDays(app: Application, now: Date = getNow()): number {
  const entered = applicationStageDate(app);
  if (!entered) return 0;
  return Math.max(0, differenceInCalendarDays(entered, now));
}

export interface PipelineMetrics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  actionRequired: number;
  breached: number;
  dueToday: number;
  approaching: number;
  onTrack: number;
  paused: number;
}

export function pipelineMetrics(
  applications: Application[],
  config: WorkflowConfig = DEFAULT_WORKFLOW_CONFIG,
  now: Date = getNow()
): PipelineMetrics {
  const metrics: PipelineMetrics = {
    total: applications.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    actionRequired: 0,
    breached: 0,
    dueToday: 0,
    approaching: 0,
    onTrack: 0,
    paused: 0
  };

  applications.forEach((app) => {
    if (app.status === 'Approved') {
      metrics.approved += 1;
      return;
    }
    if (app.status === 'Rejected') {
      metrics.rejected += 1;
      return;
    }
    metrics.pending += 1;
    if (
      app.status === 'Action Required' ||
      app.status === 'Returned' ||
      (app.deficiencies ?? []).some((deficiency) => !deficiency.resolvedAt)
    ) {
      metrics.actionRequired += 1;
    }
    const tier = applicationOverdueWindow(app, config, now).tier;
    if (tier === 'Breached') metrics.breached += 1;
    else if (tier === 'Due Today') metrics.dueToday += 1;
    else if (tier === 'Approaching') metrics.approaching += 1;
    else if (tier === 'Paused') metrics.paused += 1;
    else metrics.onTrack += 1;
  });

  return metrics;
}

export interface StagePendencyRow {
  stage: ApplicationStage;
  label: string;
  shortLabel: string;
  color: string;
  slaDays: number;
  count: number;
  share: number;
  breached: number;
  dueSoon: number;
  averageAgeDays: number;
}

export function stagePendency(
  applications: Application[],
  config: WorkflowConfig = DEFAULT_WORKFLOW_CONFIG,
  now: Date = getNow()
): StagePendencyRow[] {
  const active = applications.filter((app) => !isTerminalApplication(app));
  const total = active.length;

  return OPERATIONAL_STAGES.map((stage) => {
    const rows = active.filter((app) => canonicalStage(app.stage) === stage);
    const meta = STAGE_META[stage];
    const ageSum = rows.reduce((sum, app) => sum + applicationAgeDays(app, now), 0);
    const breached = rows.filter(
      (app) => applicationOverdueWindow(app, config, now).tier === 'Breached'
    ).length;
    const dueSoon = rows.filter((app) => {
      const tier = applicationOverdueWindow(app, config, now).tier;
      return tier === 'Due Today' || tier === 'Approaching';
    }).length;
    return {
      stage,
      label: meta.label,
      shortLabel: meta.shortLabel,
      color: meta.color,
      slaDays: config.stageSlas[stage]?.days ?? meta.slaDays,
      count: rows.length,
      share: total === 0 ? 0 : Math.round((rows.length / total) * 100),
      breached,
      dueSoon,
      averageAgeDays: rows.length === 0 ? 0 : Math.round(ageSum / rows.length)
    };
  });
}

export interface AgeingBucket {
  key: string;
  label: string;
  min: number;
  max: number | null;
  count: number;
  share: number;
}

const AGEING_DEFINITIONS: Omit<AgeingBucket, 'count' | 'share'>[] = [
  { key: 'fresh', label: '0–7 days', min: 0, max: 7 },
  { key: 'watch', label: '8–15 days', min: 8, max: 15 },
  { key: 'attention', label: '16–30 days', min: 16, max: 30 },
  { key: 'overdue', label: '31–60 days', min: 31, max: 60 },
  { key: 'critical', label: 'More than 60 days', min: 61, max: null }
];

export function ageingBuckets(
  applications: Application[],
  now: Date = getNow()
): AgeingBucket[] {
  const active = applications.filter((app) => !isTerminalApplication(app));
  const total = active.length;
  const counts = AGEING_DEFINITIONS.map(() => 0);

  active.forEach((app) => {
    const age = applicationAgeDays(app, now);
    let index = AGEING_DEFINITIONS.findIndex(
      (bucket) => age >= bucket.min && (bucket.max === null || age <= bucket.max)
    );
    if (index < 0) index = AGEING_DEFINITIONS.length - 1;
    counts[index] += 1;
  });

  return AGEING_DEFINITIONS.map((bucket, index) => ({
    ...bucket,
    count: counts[index],
    share: total === 0 ? 0 : Math.round((counts[index] / total) * 100)
  }));
}

export interface RegionBreakdownRow {
  region: Region;
  count: number;
  share: number;
}

export function regionBreakdown(applications: Application[]): RegionBreakdownRow[] {
  const total = applications.length;
  return REGION_ORDER.map((region) => {
    const count = applications.filter((app) => app.region === region).length;
    return {
      region,
      count,
      share: total === 0 ? 0 : Math.round((count / total) * 100)
    };
  }).filter((row) => row.count > 0);
}

export interface RegionStageRow {
  region: Region;
  total: number;
  counts: Record<ApplicationStage, number>;
}

export function regionStageMatrix(applications: Application[]): RegionStageRow[] {
  const active = applications.filter((app) => !isTerminalApplication(app));
  return REGION_ORDER.map((region) => {
    const rows = active.filter((app) => app.region === region);
    const counts = OPERATIONAL_STAGES.reduce(
      (accumulator, stage) => {
        accumulator[stage] = rows.filter((app) => canonicalStage(app.stage) === stage).length;
        return accumulator;
      },
      {} as Record<ApplicationStage, number>
    );
    return { region, total: rows.length, counts };
  }).filter((row) => row.total > 0);
}

export interface OfficerWorkloadRow {
  officer: string;
  count: number;
  breached: number;
  stages: ApplicationStage[];
}

export function officerForApplication(app: Application): string {
  if (app.assignedOfficerId) return app.assignedOfficerId;
  if (app.lastActionBy) return app.lastActionBy;
  const current = currentTimelineEvent(app);
  if (current?.officer) return current.officer;
  return STAGE_META[canonicalStage(app.stage)].responsible;
}

export function officerWorkload(
  applications: Application[],
  config: WorkflowConfig = DEFAULT_WORKFLOW_CONFIG,
  now: Date = getNow()
): OfficerWorkloadRow[] {
  const map = new Map<string, OfficerWorkloadRow>();

  applications
    .filter((app) => !isTerminalApplication(app))
    .forEach((app) => {
      const officer = officerForApplication(app);
      const row =
        map.get(officer) ?? { officer, count: 0, breached: 0, stages: [] as ApplicationStage[] };
      row.count += 1;
      if (applicationOverdueWindow(app, config, now).tier === 'Breached') row.breached += 1;
      const stage = canonicalStage(app.stage);
      if (!row.stages.includes(stage)) row.stages.push(stage);
      map.set(officer, row);
    });

  return [...map.values()].sort((a, b) => b.count - a.count || b.breached - a.breached);
}

export interface BottleneckRow extends StagePendencyRow {
  score: number;
}

export function bottleneckRanking(rows: StagePendencyRow[]): BottleneckRow[] {
  return rows
    .filter((row) => row.count > 0)
    .map((row) => ({
      ...row,
      score: row.breached * 3 + row.dueSoon + row.averageAgeDays
    }))
    .sort((a, b) => b.score - a.score || b.count - a.count);
}

export interface EVCQueueSummary {
  total: number;
  scheduled: number;
  pending: number;
  completed: number;
  cancelled: number;
  reportOverdue: number;
  upcoming: EVCVisit[];
}

export function evcQueueSummary(
  visits: EVCVisit[],
  config: WorkflowConfig = DEFAULT_WORKFLOW_CONFIG,
  now: Date = getNow()
): EVCQueueSummary {
  const scheduled = visits.filter((visit) => visit.status === 'Scheduled');
  const reportOverdue = scheduled.filter(
    (visit) =>
      !visit.reportSubmitted &&
      evcReportWindow(visit, now, config.evcReportSlaDays, config.businessDaysOnly).tier ===
        'Breached'
  );
  const today = now.getTime();
  const upcoming = visits
    .filter((visit) => {
      if (visit.status !== 'Scheduled' && visit.status !== 'Pending') return false;
      const date = parseDate(visit.scheduledAt) ?? parseDate(visit.date);
      return date ? date.getTime() >= startOfToday(today) : false;
    })
    .sort((a, b) => {
      const left = parseDate(a.scheduledAt) ?? parseDate(a.date);
      const right = parseDate(b.scheduledAt) ?? parseDate(b.date);
      return (left?.getTime() ?? 0) - (right?.getTime() ?? 0);
    });

  return {
    total: visits.length,
    scheduled: scheduled.length,
    pending: visits.filter((visit) => visit.status === 'Pending').length,
    completed: visits.filter((visit) => visit.status === 'Completed').length,
    cancelled: visits.filter((visit) => visit.status === 'Cancelled').length,
    reportOverdue: reportOverdue.length,
    upcoming
  };
}

function startOfToday(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function pendingReports(visits: EVCVisit[], now: Date = getNow()): EVCVisit[] {
  return visits
    .filter((visit) => visit.status !== 'Cancelled' && !visit.reportSubmitted)
    .filter((visit) => {
      const date = parseDate(visit.scheduledAt) ?? parseDate(visit.date);
      return date ? date.getTime() <= startOfToday(now.getTime()) : false;
    })
    .sort((a, b) => {
      const left = parseDate(a.date)?.getTime() ?? 0;
      const right = parseDate(b.date)?.getTime() ?? 0;
      return left - right;
    });
}

export function isReportOverdue(
  visit: EVCVisit,
  config: WorkflowConfig = DEFAULT_WORKFLOW_CONFIG,
  now: Date = getNow()
): boolean {
  if (visit.reportSubmitted) return false;
  return (
    evcReportWindow(visit, now, config.evcReportSlaDays, config.businessDaysOnly).tier === 'Breached'
  );
}

export interface ComplianceSnapshot {
  undertakings: ReturnType<typeof summariseUndertakings>;
  documents: ReturnType<typeof summariseDocuments>;
}

export function complianceSnapshot(
  undertakings: Undertaking[],
  documents: DocumentItem[],
  config: WorkflowConfig = DEFAULT_WORKFLOW_CONFIG,
  now: Date = getNow()
): ComplianceSnapshot {
  return {
    undertakings: summariseUndertakings(undertakings, now),
    documents: summariseDocuments(documents, config.documentWarningDays, now)
  };
}

export interface AlertSummary {
  open: number;
  acknowledged: number;
  resolved: number;
  critical: number;
  high: number;
}

export function alertSummary(alerts: SystemAlert[]): AlertSummary {
  const summary: AlertSummary = {
    open: 0,
    acknowledged: 0,
    resolved: 0,
    critical: 0,
    high: 0
  };
  alerts.forEach((alert) => {
    if (alert.status === 'Resolved') {
      summary.resolved += 1;
      return;
    }
    if (alert.status === 'Acknowledged') {
      summary.acknowledged += 1;
    } else {
      summary.open += 1;
    }
    if (alert.severity === 'critical') summary.critical += 1;
    if (alert.severity === 'high') summary.high += 1;
  });
  return summary;
}

export function activeAlerts(alerts: SystemAlert[]): SystemAlert[] {
  return alerts
    .filter((alert) => alert.status !== 'Resolved')
    .sort((a, b) => {
      const left = parseDate(a.createdAt)?.getTime() ?? 0;
      const right = parseDate(b.createdAt)?.getTime() ?? 0;
      return right - left;
    });
}

export function latestUpdated(applications: Application[]): string | null {
  const latest = applications.reduce<Date | null>((current, app) => {
    const date = parseDate(app.lastUpdated);
    if (!date) return current;
    return !current || date.getTime() > current.getTime() ? date : current;
  }, null);
  return latest ? toIsoDate(latest) : null;
}

export interface ProgressStep {
  stage: string;
  title: string;
  date: string;
  status: 'completed' | 'current' | 'pending';
  note?: string;
}

export function applicationProgress(app: Application): ProgressStep[] {
  return app.timeline.map((event) => ({
    stage: event.stage,
    title: STAGE_META[event.stage as ApplicationStage]?.label ?? event.stage,
    date: event.status === 'pending' ? 'Pending' : event.date,
    status: event.status,
    note: event.notes
  }));
}

export function linkedVisitFor(app: Application, visits: EVCVisit[]): EVCVisit | undefined {
  return (
    visits.find((visit) => visit.id === app.evcVisitId) ??
    visits.find((visit) => visit.applicationId === app.id)
  );
}
