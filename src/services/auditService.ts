import type { AuditLog, User, UserRole } from '../types';
import type { AuditDraft } from '../workflow/types';
import { getRepository } from './repositories';
import { readLocal, writeLocal } from './repositories/localRepository';
import { formatDisplayDate, getNow } from '../utils/dates';

const LEGACY_AUDIT_KEY = 'apoorvasetu_audit_v1';
const MAX_LOGS = 2000;

export interface AuditActor {
  id: string;
  name: string;
  role: UserRole;
}

let legacyMigrated = false;

export function formatAuditTimestamp(date: Date = getNow()): string {
  return `${formatDisplayDate(date)}, ${date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })}`;
}

function migrateLegacyLogs(): void {
  if (legacyMigrated) return;
  legacyMigrated = true;
  if (typeof window === 'undefined' || !window.localStorage) return;

  const existing = readLocal<AuditLog[]>('auditLogs', []);
  const rawLegacy = window.localStorage.getItem(LEGACY_AUDIT_KEY);
  if (!rawLegacy) return;

  try {
    const legacy = JSON.parse(rawLegacy) as AuditLog[];
    if (!Array.isArray(legacy) || legacy.length === 0) return;
    const known = new Set(existing.map((log) => log.id));
    const merged = [...existing, ...legacy.filter((log) => log && !known.has(log.id))].slice(0, MAX_LOGS);
    writeLocal('auditLogs', merged);
  } catch {
    // Legacy payload is ignored rather than blocking the audit store.
  }
}

export function actorFromUser(user: User | null | undefined): AuditActor {
  return {
    id: user?.id ?? 'USR-AICTE-001',
    name: user?.name ?? 'Amit Sharma',
    role: user?.role ?? 'AICTE_ADMIN'
  };
}

export function buildAuditEntry(draft: AuditDraft, actor: AuditActor): Omit<AuditLog, 'id'> {
  return {
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
    ipAddress: '127.0.0.1',
    eventType: draft.eventType,
    correlationId: draft.correlationId,
    source: draft.source ?? 'ui'
  };
}

export function appendAudit(draft: AuditDraft, actor: AuditActor): void {
  migrateLegacyLogs();
  const repository = getRepository();
  void repository.appendAudit(buildAuditEntry(draft, actor));
}

export function listAuditLogs(): AuditLog[] {
  migrateLegacyLogs();
  return readLocal<AuditLog[]>('auditLogs', []);
}

export interface AuditFilters {
  search?: string;
  role?: string;
  entityType?: string;
  eventType?: string;
  correlationId?: string;
}

export function filterAuditLogs(logs: AuditLog[], filters: AuditFilters): AuditLog[] {
  const search = filters.search?.trim().toLowerCase();
  return logs.filter((log) => {
    const matchesSearch =
      !search ||
      log.userName.toLowerCase().includes(search) ||
      log.action.toLowerCase().includes(search) ||
      log.details.toLowerCase().includes(search) ||
      log.entityId.toLowerCase().includes(search) ||
      (log.correlationId ?? '').toLowerCase().includes(search);
    const matchesRole = !filters.role || filters.role === 'ALL' || log.userRole === filters.role;
    const matchesEntity = !filters.entityType || filters.entityType === 'ALL' || log.entityType === filters.entityType;
    const matchesEvent = !filters.eventType || log.eventType === filters.eventType;
    const matchesCorrelation =
      !filters.correlationId || (log.correlationId ?? '').toLowerCase() === filters.correlationId.toLowerCase();
    return matchesSearch && matchesRole && matchesEntity && matchesEvent && matchesCorrelation;
  });
}
