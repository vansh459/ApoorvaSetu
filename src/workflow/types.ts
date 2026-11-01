import type {
  Application,
  ApplicationStage,
  EscalationRule,
  NotificationRule,
  SlaTier,
  StageSla,
  UserRole
} from '../types';

export type TransitionAction =
  | 'FORWARD'
  | 'RETURN'
  | 'REVERT'
  | 'APPROVE'
  | 'REJECT'
  | 'RESUBMIT';

export interface ActorRef {
  id: string;
  name: string;
  role: UserRole;
  region?: string;
  instituteId?: string;
}

export interface TransitionRequest {
  action: TransitionAction;
  actor: ActorRef;
  toStage?: ApplicationStage;
  reasonCode?: string;
  note?: string;
  expectedVersion?: number;
  overrideUndertaking?: boolean;
  competentAuthority?: string;
}

export type TransitionDenialCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'INVALID_STAGE'
  | 'STAGE_SKIP'
  | 'NO_NEXT_STAGE'
  | 'OPEN_DEFICIENCIES'
  | 'EVC_INCOMPLETE'
  | 'UNDERTAKING_PENDING'
  | 'VERSION_CONFLICT'
  | 'NOT_AUTHORITY_STAGE'
  | 'REASON_REQUIRED'
  | 'ALREADY_TERMINAL'
  | 'NOT_RETURNED';

export interface TransitionResult {
  ok: boolean;
  code?: TransitionDenialCode;
  message?: string;
  app?: Application;
  events: DomainEvent[];
  audit: AuditDraft[];
}

export type DomainEventType =
  | 'application.submitted'
  | 'application.forwarded'
  | 'application.returned'
  | 'application.resubmitted'
  | 'application.reverted'
  | 'application.approved'
  | 'application.rejected'
  | 'application.deadline_approaching'
  | 'application.deadline_breached'
  | 'evc.scheduled'
  | 'evc.rescheduled'
  | 'evc.cancelled'
  | 'evc.completed'
  | 'evc.report_overdue'
  | 'undertaking.created'
  | 'undertaking.submitted'
  | 'undertaking.verified'
  | 'undertaking.rejected'
  | 'undertaking.overdue'
  | 'compliance.submitted'
  | 'compliance.verified'
  | 'document.uploaded'
  | 'document.verified'
  | 'document.rejected'
  | 'document.expiring'
  | 'document.expired'
  | 'document.renewal_requested'
  | 'document.renewal_submitted'
  | 'document.renewal_verified'
  | 'document.renewal_rejected'
  | 'escalation.raised'
  | 'escalation.resolved';

export interface DomainEvent {
  id: string;
  type: DomainEventType;
  entityType: 'Application' | 'EVC' | 'Undertaking' | 'Document' | 'Alert' | 'Escalation';
  entityId: string;
  at: string;
  actorId?: string;
  actorName?: string;
  correlationId?: string;
  payload?: Record<string, unknown>;
}

export interface AuditDraft {
  action: string;
  entityType: 'Application' | 'User' | 'EVC' | 'Compliance' | 'Document' | 'System' | 'Auth' | 'Undertaking' | 'Alert' | 'Escalation';
  entityId: string;
  details: string;
  previousState?: string;
  newState?: string;
  eventType?: string;
  correlationId?: string;
  source?: 'ui' | 'system' | 'cron';
}

export interface WorkflowConfig {
  stageSlas: Record<ApplicationStage, StageSla>;
  escalationMatrix: EscalationRule[];
  notificationRules: NotificationRule[];
  documentWarningDays: number[];
  undertakingWarningDays: number[];
  businessDaysOnly: boolean;
  evcReportSlaDays: number;
  evcSchedulingSlaDays: number;
}

export interface WorkflowContext {
  evcVisit?: {
    id: string;
    status: string;
    reportSubmitted?: boolean;
    reportSubmittedAt?: string;
  };
  undertakings?: { id: string; status: string }[];
  config: WorkflowConfig;
  now?: Date;
}

export interface SlaView {
  tier: SlaTier;
  daysElapsed: number;
  daysRemaining: number;
  totalDays: number;
  dueDate: string | null;
}
