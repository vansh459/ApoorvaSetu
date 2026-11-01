import type {
  AuditLog as AuditLogRow,
  EscalationItem as EscalationRow,
  NotificationItem as NotificationRow,
  SystemAlert as AlertRow
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  AuditLog,
  EscalationItem,
  NotificationItem,
  SystemAlert
} from '../../src/types/index.ts';
import { optional } from './json.ts';

export function toNotification(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category as NotificationItem['category'],
    timestamp: row.timestamp,
    read: row.read,
    priority: row.priority as NotificationItem['priority'],
    link: optional(row.link),
    targetRole: (row.targetRole ?? undefined) as NotificationItem['targetRole'],
    targetRegion: (row.targetRegion ?? undefined) as NotificationItem['targetRegion'],
    targetInstituteId: optional(row.targetInstituteId),
    dedupeKey: optional(row.dedupeKey),
    eventType: optional(row.eventType),
    targetUserId: optional(row.targetUserId)
  };
}

export function toNotificationData(
  notification: NotificationItem
): Prisma.NotificationItemUncheckedCreateInput {
  return {
    id: notification.id,
    title: notification.title,
    description: notification.description,
    category: notification.category,
    timestamp: notification.timestamp,
    read: notification.read,
    priority: notification.priority,
    link: notification.link ?? null,
    targetRole: notification.targetRole ?? null,
    targetRegion: notification.targetRegion ?? null,
    targetInstituteId: notification.targetInstituteId ?? null,
    targetUserId: notification.targetUserId ?? null,
    dedupeKey: notification.dedupeKey ?? null,
    eventType: notification.eventType ?? null
  };
}

export function toSystemAlert(row: AlertRow): SystemAlert {
  return {
    id: row.id,
    rule: row.rule,
    entityType: row.entityType as SystemAlert['entityType'],
    entityId: row.entityId,
    tier: row.tier,
    severity: row.severity as SystemAlert['severity'],
    dedupeKey: row.dedupeKey,
    createdAt: row.createdAt,
    status: row.status as SystemAlert['status'],
    title: row.title,
    description: row.description,
    link: optional(row.link),
    region: (row.region ?? undefined) as SystemAlert['region'],
    instituteId: optional(row.instituteId),
    targetRoles: row.targetRoles.length
      ? (row.targetRoles as SystemAlert['targetRoles'])
      : undefined
  };
}

export function toSystemAlertData(alert: SystemAlert): Prisma.SystemAlertUncheckedCreateInput {
  return {
    id: alert.id,
    rule: alert.rule,
    entityType: alert.entityType,
    entityId: alert.entityId,
    tier: alert.tier,
    severity: alert.severity,
    dedupeKey: alert.dedupeKey,
    createdAt: alert.createdAt,
    status: alert.status,
    title: alert.title,
    description: alert.description,
    link: alert.link ?? null,
    region: alert.region ?? null,
    instituteId: alert.instituteId ?? null,
    targetRoles: alert.targetRoles ?? []
  };
}

export function toEscalation(row: EscalationRow): EscalationItem {
  return {
    id: row.id,
    applicationId: row.applicationId,
    instituteName: row.instituteName,
    region: row.region as EscalationItem['region'],
    raisedBy: row.raisedBy,
    raisedDate: row.raisedDate,
    urgency: row.urgency as EscalationItem['urgency'],
    reason: row.reason,
    status: row.status as EscalationItem['status'],
    level: optional(row.level),
    slaBreachDays: optional(row.slaBreachDays),
    dedupeKey: optional(row.dedupeKey),
    entityType: (row.entityType ?? undefined) as EscalationItem['entityType'],
    entityId: optional(row.entityId),
    acknowledgedBy: optional(row.acknowledgedBy),
    acknowledgedAt: optional(row.acknowledgedAt),
    resolvedAt: optional(row.resolvedAt)
  };
}

export function toEscalationData(escalation: EscalationItem): Prisma.EscalationItemUncheckedCreateInput {
  return {
    id: escalation.id,
    applicationId: escalation.applicationId,
    instituteName: escalation.instituteName,
    region: escalation.region,
    raisedBy: escalation.raisedBy,
    raisedDate: escalation.raisedDate,
    urgency: escalation.urgency,
    reason: escalation.reason,
    status: escalation.status,
    level: escalation.level ?? null,
    slaBreachDays: escalation.slaBreachDays ?? null,
    dedupeKey: escalation.dedupeKey ?? null,
    entityType: escalation.entityType ?? null,
    entityId: escalation.entityId ?? null,
    acknowledgedBy: escalation.acknowledgedBy ?? null,
    acknowledgedAt: escalation.acknowledgedAt ?? null,
    resolvedAt: escalation.resolvedAt ?? null
  };
}

export function toAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    timestamp: row.timestamp,
    userId: row.userId,
    userName: row.userName,
    userRole: row.userRole as AuditLog['userRole'],
    action: row.action,
    entityType: row.entityType as AuditLog['entityType'],
    entityId: row.entityId,
    details: row.details,
    previousState: optional(row.previousState),
    newState: optional(row.newState),
    ipAddress: row.ipAddress,
    eventType: optional(row.eventType),
    correlationId: optional(row.correlationId),
    source: (row.source ?? undefined) as AuditLog['source']
  };
}

export function toAuditLogData(log: AuditLog): Prisma.AuditLogUncheckedCreateInput {
  return {
    id: log.id,
    timestamp: log.timestamp,
    userId: log.userId,
    userName: log.userName,
    userRole: log.userRole,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    details: log.details,
    previousState: log.previousState ?? null,
    newState: log.newState ?? null,
    ipAddress: log.ipAddress,
    eventType: log.eventType ?? null,
    correlationId: log.correlationId ?? null,
    source: log.source ?? null
  };
}
