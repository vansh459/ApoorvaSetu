import type { Application, RouteId, Undertaking } from '../types/index.ts';
import type { WorkflowConfig } from './types.ts';
import { routeForApplication } from './routes.ts';
import { undertakingDueWindow } from './sla.ts';
import { computeDueDate, getNow, toIsoDate } from '../utils/dates.ts';

export type UndertakingBucket = 'Pending' | 'Submitted' | 'Overdue' | 'Verified' | 'Rejected';

export interface UndertakingCondition {
  code: string;
  title: string;
  description: string;
  defaultDays: number;
}

export const UNDERTAKING_CONDITIONS: UndertakingCondition[] = [
  {
    code: 'UND_LAND_CONVERSION',
    title: 'Land use conversion certificate',
    description: 'Furnish the state revenue order converting the campus land to institutional use.',
    defaultDays: 90
  },
  {
    code: 'UND_FACULTY_RETENTION',
    title: 'Faculty retention undertaking',
    description: 'File the bond retaining the approved faculty cadre for the academic year.',
    defaultDays: 120
  },
  {
    code: 'UND_FEE_REFUND',
    title: 'Fee refund policy affidavit',
    description: 'Submit the notarised affidavit adopting the AICTE fee refund policy.',
    defaultDays: 60
  },
  {
    code: 'UND_BARRIER_FREE',
    title: 'Barrier-free environment affidavit',
    description: 'Provide the signed affidavit confirming ramps and accessible facilities.',
    defaultDays: 45
  },
  {
    code: 'UND_FIRE_NOC',
    title: 'Fire safety NOC renewal',
    description: 'Renew the state fire services NOC and file the renewed certificate.',
    defaultDays: 30
  },
  {
    code: 'UND_LAB_AUGMENTATION',
    title: 'Laboratory augmentation plan',
    description: 'Submit the time-bound plan to close the recorded laboratory deficiency.',
    defaultDays: 90
  }
];

export const PENDING_UNDERTAKING_STATUSES: string[] = [
  'Pending',
  'Submitted',
  'Overdue',
  'Escalated'
];

const ROUTE_CONDITIONS: Partial<Record<RouteId, string[]>> = {
  ROUTE_SCRUTINY_ONLY: ['UND_FACULTY_RETENTION', 'UND_LAB_AUGMENTATION'],
  ROUTE_SCRUTINY_EVC: ['UND_FACULTY_RETENTION', 'UND_FEE_REFUND'],
  ROUTE_EVC_SAC: ['UND_LAND_CONVERSION', 'UND_BARRIER_FREE'],
  ROUTE_EVC_ONLY: ['UND_FEE_REFUND', 'UND_FACULTY_RETENTION'],
  ROUTE_SCRUTINY_SAC: ['UND_FACULTY_RETENTION', 'UND_LAB_AUGMENTATION']
};

export function getUndertakingCondition(code: string): UndertakingCondition | undefined {
  return UNDERTAKING_CONDITIONS.find((condition) => condition.code === code);
}

export function defaultConditionCodesFor(app: Pick<Application, 'type' | 'routeId'>): string[] {
  return ROUTE_CONDITIONS[routeForApplication(app).id] ?? ['UND_FACULTY_RETENTION'];
}

export function createUndertakingId(): string {
  return `UND-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function defaultDueDate(
  conditionCode: string,
  config: WorkflowConfig,
  now: Date = getNow()
): string {
  const condition = getUndertakingCondition(conditionCode);
  const days = condition?.defaultDays ?? 60;
  return computeDueDate(toIsoDate(now), days, config.businessDaysOnly);
}

export function buildUndertaking(
  app: Application,
  conditionCode: string,
  config: WorkflowConfig,
  now: Date = getNow(),
  dueDate?: string
): Undertaking {
  const condition = getUndertakingCondition(conditionCode);
  return {
    id: createUndertakingId(),
    applicationId: app.id,
    instituteId: app.instituteId,
    instituteName: app.instituteName,
    region: app.region,
    conditionCode: condition?.code ?? conditionCode,
    title: condition?.title ?? 'Time-bound compliance condition',
    dueDate: dueDate || defaultDueDate(conditionCode, config, now),
    evidenceDocumentIds: [],
    status: 'Pending',
    escalationLevel: 0
  };
}

export function planUndertakingsForApproval(
  app: Application,
  config: WorkflowConfig,
  now: Date = getNow()
): Undertaking[] {
  return defaultConditionCodesFor(app).map((code) => buildUndertaking(app, code, config, now));
}

export function undertakingBucket(
  undertaking: Undertaking,
  now: Date = getNow()
): UndertakingBucket {
  if (undertaking.status === 'Verified') return 'Verified';
  if (undertaking.status === 'Rejected') return 'Rejected';
  if (undertaking.status === 'Overdue' || undertaking.status === 'Escalated') return 'Overdue';
  if (undertaking.status === 'Submitted') return 'Submitted';
  const window = undertakingDueWindow(undertaking, now);
  if (window.daysOverdue > 0) return 'Overdue';
  return 'Pending';
}

export function isOpenUndertaking(undertaking: Undertaking): boolean {
  return PENDING_UNDERTAKING_STATUSES.includes(undertaking.status);
}

export interface UndertakingSummary {
  total: number;
  open: number;
  pending: number;
  submitted: number;
  overdue: number;
  verified: number;
  rejected: number;
}

export function summariseUndertakings(
  undertakings: Undertaking[],
  now: Date = getNow()
): UndertakingSummary {
  const summary: UndertakingSummary = {
    total: undertakings.length,
    open: 0,
    pending: 0,
    submitted: 0,
    overdue: 0,
    verified: 0,
    rejected: 0
  };

  undertakings.forEach((undertaking) => {
    const bucket = undertakingBucket(undertaking, now);
    if (bucket === 'Verified') summary.verified += 1;
    else if (bucket === 'Rejected') summary.rejected += 1;
    else {
      summary.open += 1;
      if (bucket === 'Overdue') summary.overdue += 1;
      else if (bucket === 'Submitted') summary.submitted += 1;
      else summary.pending += 1;
    }
  });

  return summary;
}

export function pendingUndertakings(undertakings: Undertaking[]): Undertaking[] {
  return undertakings.filter(isOpenUndertaking);
}

export function latestEvidence(undertaking: Undertaking): string | undefined {
  return undertaking.evidenceDocumentIds[undertaking.evidenceDocumentIds.length - 1];
}
