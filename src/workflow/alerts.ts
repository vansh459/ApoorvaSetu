import type {
  Application,
  DocumentItem,
  EscalationItem,
  EVCVisit,
  Region,
  SystemAlert,
  Undertaking,
  UserRole
} from '../types/index.ts';
import type { DomainEvent, DomainEventType, WorkflowConfig } from './types.ts';
import { canonicalStage, getStageMeta } from './stages.ts';
import { applicationOverdueWindow, documentExpiry, evcReportWindow, isDeadlineTier, undertakingDueWindow } from './sla.ts';
import { formatDisplayDate, getNow, toIsoDate } from '../utils/dates.ts';

export interface SweepState {
  applications: Application[];
  evcVisits: EVCVisit[];
  undertakings: Undertaking[];
  documents: DocumentItem[];
}

export interface SweepInput extends SweepState {
  alerts: SystemAlert[];
  escalations: EscalationItem[];
  config: WorkflowConfig;
  now?: Date;
}

export interface SweepResult {
  applications: Application[];
  alerts: SystemAlert[];
  escalations: EscalationItem[];
  createdAlerts: SystemAlert[];
  resolvedAlerts: SystemAlert[];
  createdEscalations: EscalationItem[];
  resolvedEscalations: EscalationItem[];
  events: DomainEvent[];
}

interface Candidate {
  rule: string;
  entityType: SystemAlert['entityType'];
  entityId: string;
  tier: string;
  severity: SystemAlert['severity'];
  title: string;
  description: string;
  link?: string;
  region?: Region;
  instituteId?: string;
  instituteName?: string;
  applicationId?: string;
  daysOverdue: number;
  event?: DomainEventType;
  eventDetail?: string;
  escalate?: boolean;
  targetRoles?: UserRole[];
}

export const AUTOMATED_RAISER = 'Automated SLA Monitor';

const SEVERITY_BY_TIER: Record<string, SystemAlert['severity']> = {  Approaching: 'medium',
  'Due Today': 'high',
  Breached: 'critical',
  Overdue: 'critical',
  'Expiring Soon': 'medium',
  Critical: 'high',
  Expired: 'critical'
};

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function alertKey(candidate: Candidate): string {
  return `${candidate.rule}:${candidate.entityType}:${candidate.entityId}:${candidate.tier}`;
}

function escalationLevel(breachDays: number, config: WorkflowConfig): number {
  const applicable = config.escalationMatrix
    .filter((rule) => breachDays >= rule.breachDays)
    .sort((a, b) => a.level - b.level);
  return applicable.length ? applicable[applicable.length - 1].level : 0;
}

function urgencyFor(level: number): EscalationItem['urgency'] {
  if (level >= 3) return 'Critical';
  if (level === 2) return 'High';
  return 'Medium';
}

function buildEvent(
  type: DomainEventType,
  entityType: DomainEvent['entityType'],
  entityId: string,
  now: Date,
  payload: Record<string, unknown> = {}
): DomainEvent {
  return {
    id: uid('EVT'),
    type,
    entityType,
    entityId,
    at: now.toISOString(),
    actorId: 'SYSTEM-SLA',
    actorName: 'Automated SLA Monitor',
    correlationId: uid('COR'),
    payload
  };
}

function tierEvent(tier: string): DomainEventType | undefined {
  if (tier === 'Breached' || tier === 'Overdue' || tier === 'Expired') return 'application.deadline_breached';
  if (tier === 'Approaching' || tier === 'Due Today' || tier === 'Expiring Soon') return 'application.deadline_approaching';
  return undefined;
}

function applicationCandidates(
  apps: Application[],
  config: WorkflowConfig,
  now: Date
): Candidate[] {
  return apps.flatMap((app) => {
    if (app.status === 'Approved' || app.status === 'Rejected' || app.status === 'Returned') return [];
    const window = applicationOverdueWindow(app, config, now);
    if (!isDeadlineTier(window.tier)) return [];
    const stage = canonicalStage(app.stage);
    const stageLabel = getStageMeta(stage).label;
    return [
      {
        rule: 'application.stage',
        entityType: 'Application' as const,
        entityId: app.id,
        tier: window.tier,
        severity: SEVERITY_BY_TIER[window.tier] ?? 'medium',
        title: `${window.tier}: ${app.id} at ${stageLabel}`,
        description:
          window.tier === 'Breached'
            ? `${app.instituteName} has crossed the statutory ${stageLabel} deadline by ${window.daysOverdue} day(s).`
            : `${app.instituteName} is nearing its ${stageLabel} deadline (${window.daysRemaining} day(s) remaining).`,
        link: '/applications',
        region: app.region,
        instituteId: app.instituteId,
        instituteName: app.instituteName,
        applicationId: app.id,
        daysOverdue: window.daysOverdue,
        event: tierEvent(window.tier),
        eventDetail: `${stageLabel} due ${window.dueAt ? formatDisplayDate(window.dueAt) : 'soon'}.`,
        escalate: window.tier === 'Breached',
        targetRoles: ['REGIONAL_OFFICER', 'AICTE_ADMIN']
      }
    ];
  });
}

function evcCandidates(visits: EVCVisit[], now: Date): Candidate[] {
  return visits.flatMap((visit) => {
    if (visit.reportSubmitted || visit.status === 'Cancelled' || !visit.applicationId) return [];
    const window = evcReportWindow(visit, now);
    if (!isDeadlineTier(window.tier)) return [];
    return [
      {
        rule: 'evc.report',
        entityType: 'EVC' as const,
        entityId: visit.id,
        tier: window.tier,
        severity: SEVERITY_BY_TIER[window.tier] ?? 'medium',
        title:
          window.tier === 'Breached'
            ? `EVC report overdue: ${visit.instituteName}`
            : `EVC report due: ${visit.instituteName}`,
        description: `Inspection report for ${visit.applicationId} is ${
          window.tier === 'Breached' ? `overdue by ${window.daysOverdue} day(s)` : 'approaching its deadline'
        }.`,
        link: '/evc-scheduling',
        region: visit.region,
        instituteId: visit.instituteId,
        instituteName: visit.instituteName,
        applicationId: visit.applicationId,
        daysOverdue: window.daysOverdue,
        event: window.tier === 'Breached' ? 'evc.report_overdue' : undefined,
        eventDetail: `Report due ${window.dueAt ? formatDisplayDate(window.dueAt) : 'soon'}.`,
        escalate: window.tier === 'Breached',
        targetRoles: ['EVC_MEMBER', 'REGIONAL_OFFICER', 'AICTE_ADMIN']
      }
    ];
  });
}

function undertakingCandidates(
  undertakings: Undertaking[],
  config: WorkflowConfig,
  now: Date
): Candidate[] {
  const warningWindow = Math.max(0, ...config.undertakingWarningDays);
  return undertakings.flatMap((item) => {
    if (item.status === 'Verified' || item.status === 'Rejected') return [];
    const window = undertakingDueWindow(item, now);
    if (window.daysOverdue === 0 && window.daysRemaining > warningWindow) return [];
    const tier = window.daysOverdue > 0 ? 'Overdue' : window.daysRemaining === 0 ? 'Due Today' : 'Approaching';
    return [
      {
        rule: 'undertaking.due',
        entityType: 'Undertaking' as const,
        entityId: item.id,
        tier,
        severity: SEVERITY_BY_TIER[tier] ?? 'medium',
        title:
          tier === 'Overdue'
            ? `Undertaking overdue: ${item.title}`
            : `Undertaking due in ${window.daysRemaining} day(s)`,
        description: `${item.instituteName} must submit evidence for ${item.conditionCode} by ${formatDisplayDate(item.dueDate)}.`,
        link: '/compliance',
        region: item.region,
        instituteId: item.instituteId,
        instituteName: item.instituteName,
        applicationId: item.applicationId,
        daysOverdue: window.daysOverdue,
        event: tier === 'Overdue' ? 'undertaking.overdue' : undefined,
        eventDetail: `${item.conditionCode} evidence window closes ${formatDisplayDate(item.dueDate)}.`,
        escalate: tier === 'Overdue',
        targetRoles: ['INSTITUTION_ADMIN', 'REGIONAL_OFFICER', 'AICTE_ADMIN']
      }
    ];
  });
}

function documentCandidates(documents: DocumentItem[], config: WorkflowConfig, now: Date): Candidate[] {
  return documents.flatMap((document) => {
    if (!document.expiryDate) return [];
    if (document.status === 'Superseded' || document.status === 'Rejected') return [];
    if (document.renewalOfId) return [];
    if (document.renewalStatus === 'Verified') return [];
    const expiry = documentExpiry(document, config.documentWarningDays, now);
    if (expiry.tier === 'Valid') return [];
    return [
      {
        rule: 'document.expiry',
        entityType: 'Document' as const,
        entityId: document.id,
        tier: expiry.tier,
        severity: SEVERITY_BY_TIER[expiry.tier] ?? 'medium',
        title:
          expiry.tier === 'Expired'
            ? `Document expired: ${document.title}`
            : `${document.title} expires in ${expiry.daysLeft} day(s)`,
        description: `${document.instituteName} — ${document.category}. Renew before validity lapses.`,
        link: '/documents',
        region: document.region,
        instituteId: document.instituteId,
        instituteName: document.instituteName,
        daysOverdue: expiry.daysLeft < 0 ? Math.abs(expiry.daysLeft) : 0,
        event: expiry.tier === 'Expired' ? 'document.expired' : 'document.expiring',
        eventDetail: `${document.title} expires ${formatDisplayDate(document.expiryDate)}.`,
        escalate: expiry.tier === 'Expired',
        targetRoles: ['INSTITUTION_ADMIN', 'REGIONAL_OFFICER', 'AICTE_ADMIN']
      }
    ];
  });
}

function resolveBelowLevels(
  escalations: EscalationItem[],
  candidate: Candidate,
  level: number
): { kept: EscalationItem[]; resolved: EscalationItem[] } {
  const resolved: EscalationItem[] = [];
  const kept = escalations.map((item) => {
    if (
      item.status !== 'Resolved' &&
      item.entityType === candidate.entityType &&
      item.entityId === candidate.entityId &&
      (item.level ?? 1) < level
    ) {
      const updated: EscalationItem = {
        ...item,
        status: 'Resolved',
        resolvedAt: toIsoDate(getNow())
      };
      resolved.push(updated);
      return updated;
    }
    return item;
  });
  return { kept, resolved };
}

export function sweepDeadlines(input: SweepInput): SweepResult {
  const now = input.now ?? getNow();
  const config = input.config;

  const candidates: Candidate[] = [
    ...applicationCandidates(input.applications, config, now),
    ...evcCandidates(input.evcVisits, now),
    ...undertakingCandidates(input.undertakings, config, now),
    ...documentCandidates(input.documents, config, now)
  ];

  const knownAlertKeys = new Set(input.alerts.map((alert) => alert.dedupeKey));
  const createdAlerts: SystemAlert[] = [];
  const events: DomainEvent[] = [];
  const workingEscalations = [...input.escalations];
  const createdEscalations: EscalationItem[] = [];
  const resolvedEscalations: EscalationItem[] = [];

  for (const candidate of candidates) {
    const key = alertKey(candidate);
    const isNewAlert = !knownAlertKeys.has(key);

    if (isNewAlert) {
      knownAlertKeys.add(key);
      const alert: SystemAlert = {
        id: uid('ALT'),
        rule: candidate.rule,
        entityType: candidate.entityType,
        entityId: candidate.entityId,
        tier: candidate.tier,
        severity: candidate.severity,
        dedupeKey: key,
        createdAt: now.toISOString(),
        status: 'Open',
        title: candidate.title,
        description: candidate.description,
        link: candidate.link ?? '/applications',
        region: candidate.region,
        instituteId: candidate.instituteId,
        targetRoles: candidate.targetRoles
      };
      createdAlerts.push(alert);

      if (candidate.event) {
        events.push(
          buildEvent(candidate.event, candidate.entityType, candidate.entityId, now, {
            detail: candidate.eventDetail ?? candidate.description,
            tier: candidate.tier,
            region: candidate.region,
            instituteId: candidate.instituteId,
            applicationId: candidate.applicationId
          })
        );
      }
    }

    if (!candidate.escalate || candidate.daysOverdue <= 0) continue;
    const level = escalationLevel(candidate.daysOverdue, config);
    if (level === 0) continue;

    const existing = workingEscalations.find(
      (item) =>
        item.status !== 'Resolved' &&
        item.entityType === candidate.entityType &&
        item.entityId === candidate.entityId &&
        (item.level ?? 1) >= level
    );
    if (existing) continue;

    const { kept, resolved } = resolveBelowLevels(workingEscalations, candidate, level);
    workingEscalations.length = 0;
    workingEscalations.push(...kept);
    resolvedEscalations.push(...resolved);

    const escalation: EscalationItem = {
      id: uid('ESC'),
      applicationId: candidate.applicationId ?? candidate.entityId,
      instituteName: candidate.instituteName ?? 'Institution',
      region: candidate.region ?? 'Others',
      raisedBy: AUTOMATED_RAISER,
      raisedDate: formatDisplayDate(now),
      urgency: urgencyFor(level),
      reason: candidate.description,
      status: 'Open',
      level,
      slaBreachDays: candidate.daysOverdue,
      dedupeKey: `escalation:${candidate.entityType}:${candidate.entityId}:L${level}`,
      entityType: candidate.entityType,
      entityId: candidate.entityId
    };
    createdEscalations.push(escalation);
    workingEscalations.unshift(escalation);
    events.push(
      buildEvent('escalation.raised', 'Escalation', escalation.id, now, {
        detail: candidate.description,
        level,
        reasonCode: candidate.rule,
        region: escalation.region,
        instituteId: candidate.instituteId,
        applicationId: candidate.applicationId
      })
    );
  }

  for (const item of workingEscalations) {
    if (item.status === 'Resolved') continue;
    if (item.raisedBy !== AUTOMATED_RAISER) continue;
    const stillBreached = candidates.some(
      (candidate) =>
        candidate.daysOverdue > 0 &&
        candidate.entityType === item.entityType &&
        candidate.entityId === item.entityId
    );
    if (stillBreached) continue;
    const resolved: EscalationItem = {
      ...item,
      status: 'Resolved',
      resolvedAt: toIsoDate(now)
    };
    const index = workingEscalations.findIndex((entry) => entry.id === item.id);
    if (index >= 0) workingEscalations[index] = resolved;
    resolvedEscalations.push(resolved);
    events.push(
      buildEvent('escalation.resolved', 'Escalation', item.id, now, {
        detail: 'Underlying deadline condition cleared.',
        level: item.level,
        region: item.region,
        applicationId: item.applicationId
      })
    );
  }

  const applications = input.applications.map((app) => {
    const window = applicationOverdueWindow(app, config, now);
    return app.slaTier === window.tier ? app : { ...app, slaTier: window.tier };
  });

  const liveAlertKeys = new Set(candidates.map(alertKey));
  const resolvedAlerts: SystemAlert[] = [];
  const workingAlerts = input.alerts.map((alert) => {
    if (alert.status === 'Resolved' || liveAlertKeys.has(alert.dedupeKey)) return alert;
    const resolved: SystemAlert = { ...alert, status: 'Resolved' };
    resolvedAlerts.push(resolved);
    return resolved;
  });

  return {
    applications,
    alerts: [...createdAlerts, ...workingAlerts],
    escalations: workingEscalations,
    createdAlerts,
    resolvedAlerts,
    createdEscalations,
    resolvedEscalations,
    events
  };
}
