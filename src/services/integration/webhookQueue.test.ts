import { describe, expect, it } from 'vitest';
import type { AuditActor } from '../auditService';
import type { AuditDraft } from '../../workflow/types';
import {
  buildWebhookEntry,
  enqueueDemoWebhook,
  listDemoWebhookOutbox,
  recordDemoWebhookDelivery
} from './webhookQueue';
import type { WebhookOutboxEntry } from './types';
import type { WebhookStore } from './webhookQueue';

const actor: AuditActor = { id: 'USR-AICTE-001', name: 'Amit Sharma', role: 'AICTE_ADMIN' };

function memoryStore(initial: WebhookOutboxEntry[] = []): WebhookStore {
  let entries = initial;
  return {
    load: () => [...entries],
    save: (next) => {
      entries = next;
    }
  };
}

const noAudit = () => {};

describe('buildWebhookEntry', () => {
  it('creates a pending, idempotent outbox row', () => {
    const entry = buildWebhookEntry(
      {
        eventType: 'application.forwarded',
        entityType: 'application',
        entityId: 'AICTE/2026/101',
        correlationId: 'COR-1'
      },
      actor,
      { id: 'WH-1', now: new Date('2026-03-01T10:00:00.000Z') }
    );

    expect(entry).toMatchObject({
      id: 'WH-1',
      status: 'Pending',
      attempts: 0,
      actorId: actor.id,
      actorName: actor.name,
      createdAt: '2026-03-01T10:00:00.000Z',
      nextAttemptAt: '2026-03-01T10:00:00.000Z',
      idempotencyKey: 'application.forwarded:application:AICTE/2026/101:COR-1'
    });
  });
});

describe('enqueueDemoWebhook', () => {
  it('queues a routing event and records it in the outbox', () => {
    const store = memoryStore();
    const result = enqueueDemoWebhook(
      { eventType: 'application.forwarded', entityType: 'application', entityId: 'AICTE/2026/101' },
      actor,
      { store, audit: noAudit, id: 'WH-1' }
    );

    expect(result.ok).toBe(true);
    expect(listDemoWebhookOutbox(store)).toHaveLength(1);
    if (result.ok) expect(result.entry.status).toBe('Pending');
  });

  it('refuses an approval that carries no competent authority', () => {
    const store = memoryStore();
    const result = enqueueDemoWebhook(
      { eventType: 'application.approved', entityType: 'application', entityId: 'AICTE/2026/101' },
      actor,
      { store, audit: noAudit }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('competentAuthority');
    expect(listDemoWebhookOutbox(store)).toHaveLength(0);
  });

  it('accepts an approval with a recorded competent authority', () => {
    const store = memoryStore();
    const result = enqueueDemoWebhook(
      {
        eventType: 'application.approved',
        entityType: 'application',
        entityId: 'AICTE/2026/101',
        payload: { competentAuthority: 'Dr. Rao, Chairperson' }
      },
      actor,
      { store, audit: noAudit }
    );

    expect(result.ok).toBe(true);
  });

  it('refuses a verification without verifiedBy', () => {
    const result = enqueueDemoWebhook(
      { eventType: 'undertaking.verified', entityType: 'undertaking', entityId: 'UND-1' },
      actor,
      { store: memoryStore(), audit: noAudit }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('verifiedBy');
  });

  it('writes a system audit entry for every queued event', () => {
    const drafts: AuditDraft[] = [];
    const result = enqueueDemoWebhook(
      {
        eventType: 'escalation.raised',
        entityType: 'escalation',
        entityId: 'ESC-9',
        correlationId: 'COR-9'
      },
      actor,
      { store: memoryStore(), audit: (draft) => drafts.push(draft) }
    );

    expect(result.ok).toBe(true);
    expect(drafts).toEqual([
      expect.objectContaining({
        action: 'Queued integration webhook',
        entityType: 'Escalation',
        entityId: 'ESC-9',
        eventType: 'integration.webhook.queued',
        correlationId: 'COR-9',
        source: 'system'
      })
    ]);
  });

  it('rejects an empty entity id and an oversized payload', () => {
    expect(
      enqueueDemoWebhook(
        { eventType: 'application.forwarded', entityType: 'application', entityId: ' ' },
        actor,
        { store: memoryStore(), audit: noAudit }
      ).ok
    ).toBe(false);

    expect(
      enqueueDemoWebhook(
        {
          eventType: 'application.forwarded',
          entityType: 'application',
          entityId: 'AICTE/2026/101',
          payload: { note: 'x'.repeat(9000) }
        },
        actor,
        { store: memoryStore(), audit: noAudit }
      ).ok
    ).toBe(false);
  });

  it('caps the demo outbox and keeps the newest event first', () => {
    const store = memoryStore();
    for (let index = 0; index < 505; index += 1) {
      enqueueDemoWebhook(
        { eventType: 'application.forwarded', entityType: 'application', entityId: `AICTE/2026/${index}` },
        actor,
        { store, audit: noAudit, id: `WH-${index}` }
      );
    }

    const entries = listDemoWebhookOutbox(store);
    expect(entries).toHaveLength(500);
    expect(entries[0].id).toBe('WH-504');
  });
});

describe('recordDemoWebhookDelivery', () => {
  it('records a failed delivery attempt', () => {
    const store = memoryStore();
    enqueueDemoWebhook(
      { eventType: 'application.forwarded', entityType: 'application', entityId: 'AICTE/2026/101' },
      actor,
      { store, audit: noAudit, id: 'WH-1' }
    );

    const updated = recordDemoWebhookDelivery(
      'WH-1',
      { status: 'Failed', error: 'Endpoint timeout' },
      store,
      new Date('2026-03-01T10:05:00.000Z')
    );

    expect(updated).toMatchObject({
      status: 'Failed',
      attempts: 1,
      lastError: 'Endpoint timeout',
      updatedAt: '2026-03-01T10:05:00.000Z'
    });
    expect(listDemoWebhookOutbox(store)[0].status).toBe('Failed');
  });

  it('returns null for an unknown entry', () => {
    expect(recordDemoWebhookDelivery('missing', { status: 'Delivered' }, memoryStore())).toBeNull();
  });
});
