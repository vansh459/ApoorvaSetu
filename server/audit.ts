import { randomBytes } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { AuditLog, UserRole } from '../src/types/index.ts';
import type { AuditDraft } from '../src/workflow/types.ts';
import { formatDisplayDate } from '../src/utils/dates.ts';
import { toAuditLogData } from './mappers/operations.ts';

export interface AuditActor {
  id: string;
  name: string;
  role: UserRole;
}

type AuditClient = Pick<PrismaClient, 'auditLog'> | Prisma.TransactionClient;

export function formatAuditTimestamp(date: Date = new Date()): string {
  return `${formatDisplayDate(date)}, ${date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })}`;
}

export function createAuditLog(
  draft: AuditDraft,
  actor: AuditActor,
  ipAddress = '127.0.0.1'
): AuditLog {
  return {
    id: `LOG-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`,
    timestamp: formatAuditTimestamp(),
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    action: draft.action,
    entityType: draft.entityType,
    entityId: draft.entityId,
    details: draft.details,
    previousState: draft.previousState,
    newState: draft.newState,
    ipAddress,
    eventType: draft.eventType,
    correlationId: draft.correlationId,
    source: draft.source ?? 'ui'
  };
}

export async function writeAudit(
  client: AuditClient,
  actor: AuditActor,
  draft: AuditDraft,
  ipAddress = '127.0.0.1'
): Promise<AuditLog> {
  const log = createAuditLog(draft, actor, ipAddress);
  await client.auditLog.create({ data: toAuditLogData(log) });
  return log;
}
