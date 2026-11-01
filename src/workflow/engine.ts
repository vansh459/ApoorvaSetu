import type {
  Application,
  ApplicationStage,
  ApplicationStatus,
  ApplicationTimelineEvent,
  Deficiency,
  ReturnRecord,
  UserRole
} from '../types/index.ts';
import { getReasonCode } from './codes.ts';
import { getApplicationStagePath, isEarlierStage, routeForApplication, routeRequiresStage } from './routes.ts';
import { canonicalStage, getStageMeta, OPERATIONAL_STAGES } from './stages.ts';
import { PENDING_UNDERTAKING_STATUSES } from './undertakings.ts';
import type {
  ActorRef,
  AuditDraft,
  DomainEvent,
  DomainEventType,
  TransitionRequest,
  TransitionResult,
  WorkflowContext
} from './types.ts';
import { computeDueDate, formatDisplayDate, getNow, parseDate, toIsoDate } from '../utils/dates.ts';

const FORWARD_ROLES: UserRole[] = ['SUPER_ADMIN', 'AICTE_ADMIN', 'REGIONAL_OFFICER'];
const AUTHORITY_ROLES: UserRole[] = ['SUPER_ADMIN', 'AICTE_ADMIN'];
const RESUBMIT_ROLES: UserRole[] = ['INSTITUTION_ADMIN', 'SUPER_ADMIN'];

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function correlationId(): string {
  return `COR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function canAct(actor: ActorRef, roles: UserRole[]): boolean {
  return roles.includes(actor.role);
}

function hasOpenDeficiencies(app: Application): boolean {
  return (app.deficiencies ?? []).some((deficiency) => !deficiency.resolvedAt);
}

function isTerminal(app: Application): boolean {
  return app.status === 'Approved' || app.status === 'Rejected';
}

function dueFor(stage: ApplicationStage, ctx: WorkflowContext, startIso: string): string {
  const sla = ctx.config.stageSlas[stage]?.days ?? getStageMeta(stage).slaDays;
  return computeDueDate(startIso, sla, ctx.config.businessDaysOnly);
}

function buildTimeline(
  app: Application,
  path: ApplicationStage[],
  currentStage: ApplicationStage,
  now: Date,
  dueAt: string,
  request: TransitionRequest
): ApplicationTimelineEvent[] {
  const existing = new Map(app.timeline.map((event) => [canonicalStage(event.stage as ApplicationStage), event]));
  const currentIndex = path.indexOf(currentStage);
  const isoNow = toIsoDate(now);
  const displayNow = formatDisplayDate(now);

  return path.map((stage, index) => {
    const previous = existing.get(stage);
    const base: ApplicationTimelineEvent = previous ?? {
      stage,
      date: 'Pending',
      status: 'pending'
    };

    if (index < currentIndex) {
      return {
        ...base,
        stage,
        status: 'completed',
        date: base.date === 'Pending' ? displayNow : base.date,
        enteredAt: base.enteredAt ?? isoNow,
        dueAt: base.dueAt ?? dueAt
      };
    }

    if (index === currentIndex) {
      return {
        ...base,
        stage,
        date: displayNow,
        status: 'current',
        enteredAt: isoNow,
        dueAt,
        actorId: request.actor.id,
        action: request.action,
        notes: request.note ?? base.notes
      };
    }

    return {
      ...base,
      stage,
      status: 'pending',
      date: base.status === 'pending' ? 'Pending' : base.date
    };
  });
}

function createEvent(
  type: DomainEventType,
  app: Application,
  request: TransitionRequest,
  corr: string,
  payload: Record<string, unknown> = {}
): DomainEvent {
  return {
    id: uid('EVT'),
    type,
    entityType: 'Application',
    entityId: app.id,
    at: getNow().toISOString(),
    actorId: request.actor.id,
    actorName: request.actor.name,
    correlationId: corr,
    payload
  };
}

function createAudit(
  request: TransitionRequest,
  appId: string,
  details: string,
  before: Application,
  after: Application,
  eventType: string,
  corr: string
): AuditDraft {
  return {
    action: request.action,
    entityType: 'Application',
    entityId: appId,
    details,
    previousState: JSON.stringify({
      stage: before.stage,
      status: before.status,
      stageDueAt: before.stageDueAt,
      version: before.version
    }),
    newState: JSON.stringify({
      stage: after.stage,
      status: after.status,
      stageDueAt: after.stageDueAt,
      version: after.version
    }),
    eventType,
    correlationId: corr,
    source: 'ui'
  };
}

function denial(code: TransitionResult['code'], message: string): TransitionResult {
  return { ok: false, code, message, events: [], audit: [] };
}

export function canTransition(
  app: Application | null | undefined,
  request: TransitionRequest,
  ctx: WorkflowContext
): TransitionResult {
  if (!app) return denial('NOT_FOUND', 'Application not found.');

  const { action } = request;

  if (isTerminal(app)) {
    return denial('ALREADY_TERMINAL', `Application is already ${app.status.toLowerCase()}.`);
  }

  if (
    request.expectedVersion !== undefined &&
    (app.version ?? 1) !== request.expectedVersion
  ) {
    return denial('VERSION_CONFLICT', 'This case was updated by another officer. Reload before acting.');
  }

  if (request.actor.role === 'REGIONAL_OFFICER' && request.actor.region && request.actor.region !== app.region) {
    return denial('FORBIDDEN', 'This case belongs to another region.');
  }

  const currentStage = canonicalStage(app.stage);
  const path = getApplicationStagePath(app);

  if (action === 'FORWARD' || action === 'REVERT' || action === 'RETURN') {
    if (!canAct(request.actor, FORWARD_ROLES)) {
      return denial('FORBIDDEN', 'Your role cannot move this application.');
    }
  }

  if (action === 'APPROVE' || action === 'REJECT') {
    if (!canAct(request.actor, AUTHORITY_ROLES)) {
      return denial('FORBIDDEN', 'Only the competent authority may approve or reject.');
    }
  }

  if (action === 'RESUBMIT' && !canAct(request.actor, RESUBMIT_ROLES)) {
    return denial('FORBIDDEN', 'Only the institution may resubmit a returned application.');
  }

  if (action === 'FORWARD') {
    if (app.status === 'Returned') {
      return denial('OPEN_DEFICIENCIES', 'The institution must resubmit the pending correction first.');
    }
    if (hasOpenDeficiencies(app)) {
      return denial('OPEN_DEFICIENCIES', 'Close the open deficiency before forwarding.');
    }

    const currentIndex = path.indexOf(currentStage);
    if (currentIndex < 0) return denial('INVALID_STAGE', 'Current stage is not part of this route.');
    if (currentIndex >= path.length - 1) {
      return denial('NO_NEXT_STAGE', 'This application is at the final stage. Use the approval decision instead.');
    }

    if (request.toStage) {
      const target = canonicalStage(request.toStage);
      if (path[currentIndex + 1] !== target) {
        return denial('STAGE_SKIP', 'Stages cannot be skipped or reversed with Forward.');
      }
    }

    if (currentStage === 'Expert Visit Committee (EVC)') {
      if (!ctx.evcVisit || (!ctx.evcVisit.reportSubmitted && ctx.evcVisit.status !== 'Completed')) {
        return denial('EVC_INCOMPLETE', 'The EVC report must be submitted before the case can move forward.');
      }
    }

    if (currentStage === 'Compliance / Undertaking Verification') {
      const pending = (ctx.undertakings ?? []).filter((item) =>
        PENDING_UNDERTAKING_STATUSES.includes(item.status)
      );
      if (pending.length > 0) {
        return denial('UNDERTAKING_PENDING', 'Verify all pending undertakings before forwarding.');
      }
    }
  }

  if (action === 'RETURN') {
    if (!request.reasonCode || !getReasonCode(request.reasonCode)) {
      return denial('REASON_REQUIRED', 'Select a valid deficiency reason code.');
    }
    if (!request.note || !request.note.trim()) {
      return denial('REASON_REQUIRED', 'A written note is required when returning a case.');
    }
  }

  if (action === 'REVERT') {
    if (!request.reasonCode || !getReasonCode(request.reasonCode) || !request.note?.trim()) {
      return denial('REASON_REQUIRED', 'Revert requires a reason code and a written note.');
    }
    if (!request.toStage || !isEarlierStage(app, request.toStage)) {
      return denial('INVALID_STAGE', 'Revert must target an earlier stage in this route.');
    }
  }

  if (action === 'APPROVE') {
    if (currentStage !== 'Final Approval') {
      return denial('NOT_AUTHORITY_STAGE', 'Final approval can only be recorded at the Final Approval stage.');
    }
    const pending = (ctx.undertakings ?? []).filter((item) =>
      PENDING_UNDERTAKING_STATUSES.includes(item.status)
    );
    const requiresUndertaking = routeForApplication(app).requiresUndertaking;
    if (pending.length > 0 && !request.overrideUndertaking) {
      return denial('UNDERTAKING_PENDING', 'Pending undertakings must be verified before final approval.');
    }
    if (requiresUndertaking && (ctx.undertakings ?? []).length === 0 && !request.overrideUndertaking) {
      return denial('UNDERTAKING_PENDING', 'Record the time-bound undertaking before final approval.');
    }
  }

  if (action === 'REJECT') {
    if (!request.reasonCode || !getReasonCode(request.reasonCode) || !request.note?.trim()) {
      return denial('REASON_REQUIRED', 'Rejection requires a statutory reason code and a written note.');
    }
  }

  if (action === 'RESUBMIT' && app.status !== 'Returned') {
    return denial('NOT_RETURNED', 'Only a returned application can be resubmitted.');
  }

  return { ok: true, events: [], audit: [] };
}

export function applyTransition(
  app: Application,
  request: TransitionRequest,
  ctx: WorkflowContext
): TransitionResult {
  const check = canTransition(app, request, ctx);
  if (!check.ok) return check;

  const now = ctx.now ?? getNow();
  const isoNow = toIsoDate(now);
  const displayNow = formatDisplayDate(now);
  const corr = correlationId();
  const currentStage = canonicalStage(app.stage);
  const path = getApplicationStagePath(app);

  let updated: Application = { ...app };
  let eventType: DomainEventType = 'application.forwarded';
  let auditDetails = '';

  if (request.action === 'FORWARD') {
    const currentIndex = path.indexOf(currentStage);
    const nextStage = request.toStage ? canonicalStage(request.toStage) : path[currentIndex + 1];
    const stageStart = isoNow;
    const dueAt = dueFor(nextStage, ctx, stageStart);

    updated = {
      ...app,
      stage: nextStage,
      status: 'In Progress',
      stageEnteredAt: stageStart,
      stageDueAt: dueAt,
      slaTier: 'On Track',
      lastUpdated: displayNow,
      remarks: request.note || `Forwarded to ${nextStage}.`,
      timeline: buildTimeline(app, path, nextStage, now, dueAt, request),
      version: (app.version ?? 1) + 1,
      lastActionBy: request.actor.name
    };
    eventType = 'application.forwarded';
    auditDetails = `Application ${app.id} forwarded from ${currentStage} to ${nextStage}.`;
  }

  if (request.action === 'RETURN') {
    const deficiency: Deficiency = {
      code: request.reasonCode!,
      note: request.note!,
      stage: currentStage,
      raisedAt: isoNow,
      raisedBy: request.actor.name
    };
    const returnRecord: ReturnRecord = {
      fromStage: currentStage,
      toStage: currentStage,
      code: request.reasonCode!,
      note: request.note!,
      by: request.actor.name,
      at: isoNow
    };

    updated = {
      ...app,
      status: 'Returned',
      slaTier: 'Paused',
      deficiencies: [...(app.deficiencies ?? []), deficiency],
      returns: [...(app.returns ?? []), returnRecord],
      lastUpdated: displayNow,
      remarks: `Returned for correction (${request.reasonCode}): ${request.note}`,
      timeline: app.timeline.map((event) =>
        canonicalStage(event.stage as ApplicationStage) === currentStage
          ? { ...event, notes: `Returned (${request.reasonCode}): ${request.note}`, action: 'RETURN', actorId: request.actor.id }
          : event
      ),
      version: (app.version ?? 1) + 1,
      lastActionBy: request.actor.name
    };
    eventType = 'application.returned';
    auditDetails = `Application ${app.id} returned at ${currentStage} with ${request.reasonCode}.`;
  }

  if (request.action === 'RESUBMIT') {
    const resolvedAt = isoNow;
    const returns = [...(app.returns ?? [])];
    const lastReturnIndex = returns.map((item) => !item.resubmittedAt).lastIndexOf(true);
    if (lastReturnIndex >= 0) {
      returns[lastReturnIndex] = { ...returns[lastReturnIndex], resubmittedAt: resolvedAt };
    }
    const stageStart = isoNow;
    const dueAt = dueFor(currentStage, ctx, stageStart);

    updated = {
      ...app,
      status: 'In Progress',
      slaTier: 'On Track',
      stageEnteredAt: stageStart,
      stageDueAt: dueAt,
      deficiencies: (app.deficiencies ?? []).map((deficiency) =>
        deficiency.resolvedAt ? deficiency : { ...deficiency, resolvedAt }
      ),
      returns,
      lastUpdated: displayNow,
      remarks: request.note || 'Institution resubmitted the corrected application.',
      timeline: app.timeline.map((event) =>
        canonicalStage(event.stage as ApplicationStage) === currentStage
          ? {
              ...event,
              notes: request.note || 'Corrections resubmitted by the institution.',
              action: 'RESUBMIT',
              actorId: request.actor.id,
              dueAt
            }
          : event
      ),
      version: (app.version ?? 1) + 1,
      lastActionBy: request.actor.name
    };
    eventType = 'application.resubmitted';
    auditDetails = `Application ${app.id} resubmitted by the institution; scrutiny clock restarted.`;
  }

  if (request.action === 'REVERT') {
    const target = canonicalStage(request.toStage!);
    const stageStart = isoNow;
    const dueAt = dueFor(target, ctx, stageStart);
    const returnRecord: ReturnRecord = {
      fromStage: currentStage,
      toStage: target,
      code: request.reasonCode!,
      note: request.note!,
      by: request.actor.name,
      at: isoNow
    };

    updated = {
      ...app,
      stage: target,
      status: 'In Progress',
      stageEnteredAt: stageStart,
      stageDueAt: dueAt,
      slaTier: 'On Track',
      returns: [...(app.returns ?? []), returnRecord],
      lastUpdated: displayNow,
      remarks: `Reverted to ${target} (${request.reasonCode}): ${request.note}`,
      timeline: buildTimeline(app, path, target, now, dueAt, request),
      version: (app.version ?? 1) + 1,
      lastActionBy: request.actor.name
    };
    eventType = 'application.reverted';
    auditDetails = `Application ${app.id} reverted from ${currentStage} to ${target} with ${request.reasonCode}.`;
  }

  if (request.action === 'APPROVE') {
    updated = {
      ...app,
      stage: 'Final Approval',
      status: 'Approved',
      slaTier: 'On Track',
      decision: {
        outcome: 'Approved',
        code: request.reasonCode || 'APPROVED_FINAL',
        note: request.note || 'Final approval granted by the competent authority.',
        by: request.actor.name,
        at: isoNow,
        competentAuthority: request.competentAuthority || request.actor.name
      },
      lastUpdated: displayNow,
      remarks: request.note || 'Final approval granted by AICTE Competent Authority.',
      timeline: app.timeline.map((event) =>
        canonicalStage(event.stage as ApplicationStage) === 'Final Approval'
          ? {
              ...event,
              status: 'completed',
              date: displayNow,
              notes: request.note || 'Final approval granted.',
              action: 'APPROVE',
              actorId: request.actor.id
            }
          : event
      ),
      version: (app.version ?? 1) + 1,
      lastActionBy: request.actor.name
    };
    eventType = 'application.approved';
    auditDetails = `Application ${app.id} approved by ${request.competentAuthority || request.actor.name}.`;
  }

  if (request.action === 'REJECT') {
    updated = {
      ...app,
      status: 'Rejected',
      slaTier: 'On Track',
      decision: {
        outcome: 'Rejected',
        code: request.reasonCode!,
        note: request.note!,
        by: request.actor.name,
        at: isoNow,
        competentAuthority: request.competentAuthority || request.actor.name
      },
      lastUpdated: displayNow,
      remarks: `Rejected (${request.reasonCode}): ${request.note}`,
      timeline: app.timeline.map((event) =>
        canonicalStage(event.stage as ApplicationStage) === currentStage
          ? {
              ...event,
              status: 'completed',
              date: displayNow,
              notes: `Rejected (${request.reasonCode}): ${request.note}`,
              action: 'REJECT',
              actorId: request.actor.id
            }
          : event
      ),
      version: (app.version ?? 1) + 1,
      lastActionBy: request.actor.name
    };
    eventType = 'application.rejected';
    auditDetails = `Application ${app.id} rejected with ${request.reasonCode} by ${request.actor.name}.`;
  }

  const event = createEvent(eventType, updated, request, corr, {
    fromStage: currentStage,
    toStage: updated.stage,
    reasonCode: request.reasonCode,
    note: request.note
  });

  const audit = createAudit(request, app.id, auditDetails, app, updated, eventType, corr);

  return { ok: true, app: updated, events: [event], audit: [audit] };
}

export function normalizeApplication(app: Application, now: Date = getNow()): Application {
  const route = routeForApplication(app);
  const stage = canonicalStage(app.stage);
  const stageEnteredAt = app.stageEnteredAt
    ?? (app.lastUpdated && app.lastUpdated !== 'Pending' ? toIsoDate(app.lastUpdated) : toIsoDate(now));
  const slaDays = getStageMeta(stage).slaDays;
  const stageDueAt = app.stageDueAt ?? computeDueDate(stageEnteredAt, slaDays, false);
  const path = getApplicationStagePath({ ...app, stage, routeId: route.id });
  const timelineByStage = new Map(app.timeline.map((event) => [canonicalStage(event.stage as ApplicationStage), event]));
  const timeline: ApplicationTimelineEvent[] = path.map((pathStage) => {
    const existing = timelineByStage.get(pathStage);
    if (existing) {
      return {
        ...existing,
        stage: pathStage,
        enteredAt: existing.enteredAt ?? parseEventDate(existing),
        dueAt: existing.dueAt ?? (pathStage === stage ? stageDueAt : undefined)
      };
    }
    return {
      stage: pathStage,
      date: 'Pending',
      status: 'pending'
    };
  });

  return {
    ...app,
    stage,
    routeId: route.id,
    stageEnteredAt,
    stageDueAt,
    slaTier: app.status === 'Returned' ? 'Paused' : app.slaTier ?? 'On Track',
    version: app.version ?? 1,
    deficiencies: app.deficiencies ?? [],
    returns: app.returns ?? [],
    timeline
  };
}

function parseEventDate(event: ApplicationTimelineEvent): string | undefined {
  const date = parseDate(event.date);
  return date ? toIsoDate(date) : undefined;
}

export function nextStageFor(app: Application): ApplicationStage | null {
  const path = getApplicationStagePath(app);
  const index = path.indexOf(canonicalStage(app.stage));
  if (index < 0 || index >= path.length - 1) return null;
  return path[index + 1];
}

export function availableRevertStages(app: Application): ApplicationStage[] {
  const path = getApplicationStagePath(app);
  const currentIndex = path.indexOf(canonicalStage(app.stage));
  return path.slice(0, Math.max(0, currentIndex));
}

export function routeStages(app: Application): ApplicationStage[] {
  return routeForApplication(app).stages;
}

export function stageSlaFor(app: Application, config: WorkflowContext['config']): number {
  return config.stageSlas[canonicalStage(app.stage)]?.days ?? getStageMeta(app.stage).slaDays;
}

export function terminalStatuses(): ApplicationStatus[] {
  return ['Approved', 'Rejected'];
}

export function isOperationalApplicationStage(stage: ApplicationStage): boolean {
  return OPERATIONAL_STAGES.includes(stage);
}

export function requiresUndertaking(app: Application): boolean {
  return routeRequiresStage(app, 'Approval (Subject to Undertaking)');
}

export function reasonLabel(code?: string): string {
  return code ? getReasonCode(code)?.label ?? code : '';
}

export function stageSlaMeta(app: Application): ReturnType<typeof getStageMeta> {
  return getStageMeta(app.stage);
}
