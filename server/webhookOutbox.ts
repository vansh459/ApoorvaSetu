import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { IntegrationEvent, IntegrationEntityType } from '../src/services/integration/types.ts';
import { missingHumanAuthority } from '../src/services/integration/types.ts';

export interface WebhookActor {
  id: string;
  name: string;
  role: string;
}

export interface ServerEnqueueOptions {
  idempotencyKey?: string;
}

export type ServerEnqueueResult =
  | { ok: true; id: string; duplicate: boolean; audited: boolean }
  | { ok: false; reason: string };

const AUDIT_ENTITY_TYPES: Record<IntegrationEntityType, string> = {
  application: 'Application',
  evc_visit: 'EVC',
  undertaking: 'Undertaking',
  document: 'Document',
  compliance: 'Compliance',
  escalation: 'Escalation'
};

function serviceClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

/**
 * Server-only outbox writer. Requires the service role key, so it must never be
 * imported into browser code. Enqueues the webhook and best-effort audits it.
 */
export async function enqueueWebhookServer(
  event: IntegrationEvent,
  actor: WebhookActor,
  options: ServerEnqueueOptions = {}
): Promise<ServerEnqueueResult> {
  if (!event.entityId.trim()) {
    return { ok: false, reason: 'An entity id is required.' };
  }

  const missingAuthority = missingHumanAuthority(event);
  if (missingAuthority) {
    return { ok: false, reason: missingAuthority };
  }

  const client = serviceClient();
  if (!client) {
    return { ok: false, reason: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server.' };
  }

  const idempotencyKey =
    options.idempotencyKey ??
    `${event.eventType}:${event.entityType}:${event.entityId}:${
      event.correlationId ?? crypto.randomUUID()
    }`;

  const { data, error } = await client
    .from('webhook_outbox')
    .upsert(
      {
        event_type: event.eventType,
        entity_type: event.entityType,
        entity_id: event.entityId,
        payload: event.payload ?? {},
        idempotency_key: idempotencyKey,
        status: 'Pending'
      },
      { onConflict: 'idempotency_key', ignoreDuplicates: true }
    )
    .select('id')
    .maybeSingle();

  if (error) {
    return { ok: false, reason: error.message };
  }

  let id = data?.id as string | undefined;
  let duplicate = false;

  if (!id) {
    const { data: existing, error: lookupError } = await client
      .from('webhook_outbox')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (lookupError || !existing) {
      return { ok: false, reason: lookupError?.message ?? 'Could not queue the webhook.' };
    }
    id = existing.id as string;
    duplicate = true;
  }

  const { error: auditError } = await client.from('audit_logs').insert({
    user_id: actor.id,
    user_name: actor.name,
    user_role: actor.role,
    action: 'Queued integration webhook',
    entity_type: AUDIT_ENTITY_TYPES[event.entityType],
    entity_id: event.entityId,
    details: `Queued ${event.eventType} for outbound delivery (${idempotencyKey}).`,
    event_type: 'integration.webhook.queued',
    correlation_id: event.correlationId ?? null,
    source: 'system'
  });

  if (auditError) {
    console.error('[webhook-outbox] Audit write failed:', auditError.message);
  }

  return { ok: true, id, duplicate, audited: !auditError };
}
