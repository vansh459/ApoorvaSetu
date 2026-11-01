export type IntegrationEntityType =
  | 'application'
  | 'evc_visit'
  | 'undertaking'
  | 'document'
  | 'compliance'
  | 'escalation';

export type IntegrationEventType =
  | 'application.submitted'
  | 'application.forwarded'
  | 'application.returned'
  | 'application.approved'
  | 'application.rejected'
  | 'evc.report.submitted'
  | 'undertaking.submitted'
  | 'undertaking.verified'
  | 'document.verified'
  | 'compliance.verified'
  | 'escalation.raised';

export interface IntegrationEvent {
  eventType: IntegrationEventType;
  entityType: IntegrationEntityType;
  entityId: string;
  payload?: Record<string, unknown>;
  correlationId?: string;
}

export type HumanAuthorityField = 'competentAuthority' | 'verifiedBy';

export const HUMAN_AUTHORITY_FIELD: Partial<Record<IntegrationEventType, HumanAuthorityField>> = {
  'application.approved': 'competentAuthority',
  'application.rejected': 'competentAuthority',
  'undertaking.verified': 'verifiedBy',
  'document.verified': 'verifiedBy',
  'compliance.verified': 'verifiedBy'
};

/**
 * Automation may route, remind and escalate but never decide. Any outbound event
 * that implies a decision or verification must carry the responsible human.
 */
export function missingHumanAuthority(
  event: Pick<IntegrationEvent, 'eventType' | 'payload'>
): string | null {
  const field = HUMAN_AUTHORITY_FIELD[event.eventType];
  if (!field) return null;
  const value = event.payload?.[field];
  if (typeof value === 'string' && value.trim()) return null;
  return `${event.eventType} requires a recorded ${field}. Automation may not decide on its own.`;
}

export type WebhookOutboxStatus = 'Pending' | 'Delivering' | 'Delivered' | 'Failed';

export interface WebhookOutboxEntry {
  id: string;
  eventType: IntegrationEventType;
  entityType: IntegrationEntityType;
  entityId: string;
  payload: Record<string, unknown>;
  correlationId?: string;
  idempotencyKey: string;
  status: WebhookOutboxStatus;
  attempts: number;
  nextAttemptAt: string;
  lastError?: string;
  actorId: string;
  actorName: string;
  createdAt: string;
  updatedAt: string;
}
