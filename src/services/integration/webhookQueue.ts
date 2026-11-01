import type { AuditActor } from '../auditService';
import { appendAudit } from '../auditService';
import type { AuditDraft } from '../../workflow/types';
import type {
  IntegrationEvent,
  IntegrationEntityType,
  WebhookOutboxEntry,
  WebhookOutboxStatus
} from './types';
import { missingHumanAuthority } from './types';

const STORAGE_KEY = 'apoorvasetu_webhook_outbox_v1';
const MAX_ENTRIES = 500;
const MAX_PAYLOAD_CHARS = 8 * 1024;

const AUDIT_ENTITY_TYPES: Record<IntegrationEntityType, AuditDraft['entityType']> = {
  application: 'Application',
  evc_visit: 'EVC',
  undertaking: 'Undertaking',
  document: 'Document',
  compliance: 'Compliance',
  escalation: 'Escalation'
};

export interface WebhookStore {
  load(): WebhookOutboxEntry[];
  save(entries: WebhookOutboxEntry[]): void;
}

function hasStorage(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export const localWebhookStore: WebhookStore = {
  load() {
    if (!hasStorage()) return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as WebhookOutboxEntry[]) : [];
    } catch {
      return [];
    }
  },
  save(entries) {
    if (!hasStorage()) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Storage quota failures must not break the caller's workflow.
    }
  }
};

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `WH-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export interface BuildWebhookOptions {
  now?: Date;
  id?: string;
  idempotencyKey?: string;
}

export function buildWebhookEntry(
  event: IntegrationEvent,
  actor: AuditActor,
  options: BuildWebhookOptions = {}
): WebhookOutboxEntry {
  const now = (options.now ?? new Date()).toISOString();
  const id = options.id ?? newId();
  return {
    id,
    eventType: event.eventType,
    entityType: event.entityType,
    entityId: event.entityId,
    payload: event.payload ?? {},
    correlationId: event.correlationId,
    idempotencyKey:
      options.idempotencyKey ??
      `${event.eventType}:${event.entityType}:${event.entityId}:${event.correlationId ?? id}`,
    status: 'Pending',
    attempts: 0,
    nextAttemptAt: now,
    actorId: actor.id,
    actorName: actor.name,
    createdAt: now,
    updatedAt: now
  };
}

export type EnqueueWebhookResult =
  | { ok: true; entry: WebhookOutboxEntry }
  | { ok: false; reason: string };

export interface EnqueueWebhookOptions extends BuildWebhookOptions {
  store?: WebhookStore;
  audit?: (draft: AuditDraft, actor: AuditActor) => void;
}

/**
 * Queues an outbound event in demo mode. In production the outbox row is written
 * server-side with the service role; the browser never touches webhook_outbox.
 */
export function enqueueDemoWebhook(
  event: IntegrationEvent,
  actor: AuditActor,
  options: EnqueueWebhookOptions = {}
): EnqueueWebhookResult {
  if (!event.entityId.trim()) {
    return { ok: false, reason: 'An entity id is required.' };
  }

  const missingAuthority = missingHumanAuthority(event);
  if (missingAuthority) {
    return { ok: false, reason: missingAuthority };
  }

  let payloadSize = 0;
  try {
    payloadSize = JSON.stringify(event.payload ?? {}).length;
  } catch {
    return { ok: false, reason: 'The webhook payload must be JSON serialisable.' };
  }
  if (payloadSize > MAX_PAYLOAD_CHARS) {
    return { ok: false, reason: 'The webhook payload is too large.' };
  }

  const store = options.store ?? localWebhookStore;
  const entry = buildWebhookEntry(event, actor, options);
  const entries = [entry, ...store.load()].slice(0, MAX_ENTRIES);
  store.save(entries);

  const audit = options.audit ?? appendAudit;
  audit(
    {
      action: 'Queued integration webhook',
      entityType: AUDIT_ENTITY_TYPES[event.entityType],
      entityId: event.entityId,
      details: `Queued ${event.eventType} for outbound delivery (${entry.idempotencyKey}).`,
      eventType: 'integration.webhook.queued',
      correlationId: event.correlationId,
      source: 'system'
    },
    actor
  );

  return { ok: true, entry };
}

export function listDemoWebhookOutbox(store: WebhookStore = localWebhookStore): WebhookOutboxEntry[] {
  return store.load();
}

export interface WebhookDeliveryResult {
  status: Extract<WebhookOutboxStatus, 'Delivered' | 'Failed'>;
  error?: string;
  attempts?: number;
}

export function recordDemoWebhookDelivery(
  id: string,
  result: WebhookDeliveryResult,
  store: WebhookStore = localWebhookStore,
  now: Date = new Date()
): WebhookOutboxEntry | null {
  const entries = store.load();
  const timestamp = now.toISOString();
  let updated: WebhookOutboxEntry | null = null;

  const next = entries.map((entry) => {
    if (entry.id !== id) return entry;
    updated = {
      ...entry,
      status: result.status,
      attempts: result.attempts ?? entry.attempts + 1,
      lastError: result.error,
      updatedAt: timestamp,
      nextAttemptAt: timestamp
    };
    return updated;
  });

  if (updated) store.save(next);
  return updated;
}
