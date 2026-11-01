import type { Application, DocumentItem, EVCVisit, SlaTier, Undertaking } from '../types';
import type { WorkflowConfig } from './types';
import { DEFAULT_WORKFLOW_CONFIG } from './config';
import { canonicalStage, getStageMeta } from './stages';
import {
  computeDueDate,
  differenceInCalendarDays,
  evaluateSla,
  getNow,
  parseDate,
  toIsoDate
} from '../utils/dates';
import type { SlaInfo } from '../utils/dates';

export function stageWindow(
  stage: Application['stage'],
  config: WorkflowConfig,
  start: string | Date,
  businessDaysOnly = config.businessDaysOnly
): { enteredAt: string; dueAt: string; slaDays: number } {
  const slaDays = config.stageSlas[canonicalStage(stage)]?.days ?? getStageMeta(stage).slaDays;
  const enteredAt = typeof start === 'string' ? toIsoDate(start) : toIsoDate(start);
  return { enteredAt, dueAt: computeDueDate(enteredAt, slaDays, businessDaysOnly), slaDays };
}

export function approachingPctFor(stage: Application['stage'], config: WorkflowConfig): number {
  return config.stageSlas[canonicalStage(stage)]?.approachingPct ?? 80;
}

export function applicationSla(
  app: Application,
  config: WorkflowConfig,
  now: Date = getNow()
): SlaInfo {
  const paused = app.status === 'Returned';
  return evaluateSla(
    app.stageEnteredAt,
    app.stageDueAt,
    approachingPctFor(app.stage, config),
    now,
    paused
  );
}

export function refreshApplicationSla(
  app: Application,
  config: WorkflowConfig,
  now: Date = getNow()
): Application {
  const info = applicationSla(app, config, now);
  return app.slaTier === info.tier ? app : { ...app, slaTier: info.tier };
}

export interface OverdueWindow {
  tier: SlaTier;
  daysRemaining: number;
  daysOverdue: number;
  dueAt: string | null;
}

export function overdueWindow(
  start: string | undefined,
  due: string | undefined,
  approachingPct: number,
  now: Date = getNow(),
  paused = false
): OverdueWindow {
  if (!parseDate(start) && parseDate(due)) {
    const daysRemaining = differenceInCalendarDays(now, due as string);
    const tier: SlaTier =
      daysRemaining < 0 ? 'Breached' : daysRemaining === 0 ? 'Due Today' : 'Approaching';
    return {
      tier,
      daysRemaining,
      daysOverdue: daysRemaining < 0 ? Math.abs(daysRemaining) : 0,
      dueAt: toIsoDate(due as string)
    };
  }
  const info = evaluateSla(start, due, approachingPct, now, paused);
  return {
    tier: info.tier,
    daysRemaining: info.daysRemaining,
    daysOverdue: info.daysRemaining < 0 ? Math.abs(info.daysRemaining) : 0,
    dueAt: info.dueDate
  };
}

export function applicationOverdueWindow(
  app: Application,
  config: WorkflowConfig,
  now: Date = getNow()
): OverdueWindow {
  if (app.status === 'Approved' || app.status === 'Rejected') {
    return { tier: 'On Track', daysRemaining: 0, daysOverdue: 0, dueAt: app.stageDueAt ?? null };
  }
  return overdueWindow(
    app.stageEnteredAt,
    app.stageDueAt,
    approachingPctFor(app.stage, config),
    now,
    app.status === 'Returned'
  );
}

export function evcReportWindow(
  visit: EVCVisit,
  now: Date = getNow(),
  reportSlaDays = DEFAULT_WORKFLOW_CONFIG.evcReportSlaDays,
  businessDaysOnly = DEFAULT_WORKFLOW_CONFIG.businessDaysOnly
): OverdueWindow {
  const start = visit.scheduledAt ?? visit.date;
  const due =
    visit.reportDueAt ??
    (parseDate(start) ? computeDueDate(start, reportSlaDays, businessDaysOnly) : undefined);
  if (visit.reportSubmitted) {
    return { tier: 'On Track', daysRemaining: 0, daysOverdue: 0, dueAt: due ?? null };
  }
  if (visit.status !== 'Scheduled' && visit.status !== 'Completed') {
    return { tier: 'On Track', daysRemaining: 0, daysOverdue: 0, dueAt: due ?? null };
  }
  return overdueWindow(start, due, 80, now);
}

export function undertakingDueWindow(
  undertaking: Undertaking,
  config: WorkflowConfig,
  now: Date = getNow()
): OverdueWindow {
  if (undertaking.status === 'Verified' || undertaking.status === 'Rejected') {
    return { tier: 'On Track', daysRemaining: 0, daysOverdue: 0, dueAt: undertaking.dueDate };
  }
  return overdueWindow(undefined, undertaking.dueDate, 80, now);
}

export type DocumentExpiryTier = 'Valid' | 'Expiring Soon' | 'Critical' | 'Expired';

export interface DocumentExpiry {
  tier: DocumentExpiryTier;
  daysLeft: number;
  expiryDate: string;
}

export function documentExpiry(
  document: Pick<DocumentItem, 'expiryDate'>,
  warningDays: number[],
  now: Date = getNow()
): DocumentExpiry {
  const expiry = parseDate(document.expiryDate);
  if (!expiry) return { tier: 'Valid', daysLeft: Number.POSITIVE_INFINITY, expiryDate: document.expiryDate };
  const daysLeft = differenceInCalendarDays(now, expiry);
  const sorted = [...warningDays].sort((a, b) => b - a);
  const farThreshold = sorted[0] ?? 60;
  const criticalThreshold = sorted.length > 1 ? sorted[1] : farThreshold;
  if (daysLeft < 0) return { tier: 'Expired', daysLeft, expiryDate: document.expiryDate };
  if (daysLeft <= criticalThreshold) return { tier: 'Critical', daysLeft, expiryDate: document.expiryDate };
  if (daysLeft <= farThreshold) return { tier: 'Expiring Soon', daysLeft, expiryDate: document.expiryDate };
  return { tier: 'Valid', daysLeft, expiryDate: document.expiryDate };
}

export function isDeadlineTier(tier: SlaTier): boolean {
  return tier === 'Approaching' || tier === 'Due Today' || tier === 'Breached';
}
