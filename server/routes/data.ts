import { Router } from 'express';
import type { Request, Response } from 'express';
import type {
  Application,
  AuditLog,
  ComplianceRecord,
  DocumentItem,
  EscalationItem,
  EVCVisit,
  NotificationItem,
  Permission,
  SystemAlert,
  Undertaking,
  User
} from '../../src/types/index.ts';
import {
  filterAlertsForUser,
  filterApplicationsForUser,
  filterComplianceForUser,
  filterDocumentsForUser,
  filterEVCVisitsForUser,
  filterInstitutesForUser,
  filterNotificationsForUser,
  filterUndertakingsForUser,
  hasPermission
} from '../../src/services/rbacService.ts';
import { clearDatabase, seedDatabase } from '../../prisma/seedData.ts';
import { AUTOMATED_RAISER } from '../../src/workflow/alerts.ts';
import { getPrisma } from '../db.ts';
import { writeAudit } from '../audit.ts';
import { broadcast } from '../events.ts';
import type { TableName } from '../events.ts';
import { asyncHandler, HttpError } from '../http.ts';
import {
  parseApplication,
  parseComplianceRecord,
  parseDocumentItem,
  parseEscalation,
  parseEVCVisit,
  parseNotification,
  parseSystemAlert,
  parseSystemConfig,
  parseUndertaking
} from '../payload.ts';
import { clientIp } from '../rateLimit.ts';
import {
  assertAnyPermission,
  assertPresentScope,
  assertScope,
  assertUnchanged,
  isCentral,
  requireUser
} from '../scope.ts';
import type { ScopedEntity } from '../scope.ts';
import { clearSessionCookie, requireSession } from '../session.ts';
import { requireObject, requireString, optionalString } from '../validate.ts';
import { toRolePermissions, toSystemConfig, toSystemConfigData, toUser } from '../mappers/admin.ts';
import {
  toApplication,
  toApplicationData,
  toComplianceRecord,
  toComplianceRecordData,
  toDocumentItem,
  toDocumentItemData,
  toEVCVisit,
  toEVCVisitData,
  toEscalation,
  toEscalationData,
  toInstitute,
  toNotification,
  toNotificationData,
  toSystemAlert,
  toSystemAlertData,
  toUndertaking,
  toUndertakingData
} from '../mappers/index.ts';
import { toAuditLog } from '../mappers/operations.ts';
import { formatAuditTimestamp } from '../audit.ts';

export const dataRouter = Router();
dataRouter.use(requireSession);

function findOrThrow<T>(value: T | null | undefined, label: string): T {
  if (!value) throw new HttpError(404, 'NOT_FOUND', `${label} was not found.`);
  return value;
}

function nowStamp(): string {
  return formatAuditTimestamp();
}

interface SaveSpec<T> {
  table: TableName;
  label: string;
  permissions: readonly Permission[];
  parse: (body: Record<string, unknown>) => T;
  idOf: (data: T) => string;
  scopeOf: (data: T) => ScopedEntity;
  scopeMode?: 'always' | 'present';
  find: (id: string) => Promise<T | null>;
  create: (data: T, user: User) => Promise<T | void>;
  update: (data: T, existing: T, user: User) => Promise<T | void>;
  guard?: (data: T, existing: T) => void;
  onCreate?: (data: T, user: User) => void;
}

function assertRecordScope<T>(spec: SaveSpec<T>, user: User, data: T): void {
  const scope = spec.scopeOf(data);
  if (spec.scopeMode === 'present') {
    assertPresentScope(user, scope);
    return;
  }
  assertScope(user, scope);
}

function saveHandler<T>(spec: SaveSpec<T>) {
  return asyncHandler(async (req: Request, res: Response) => {
    const user =
      spec.permissions.length > 0 ? assertAnyPermission(req, spec.permissions) : requireUser(req);
    const body = requireObject(req.body);
    const data = spec.parse(body);
    const pathId = req.params.id;

    if (pathId && spec.idOf(data) !== pathId) {
      throw new HttpError(400, 'ID_MISMATCH', 'The body id must match the URL id.');
    }

    assertRecordScope(spec, user, data);

    if (pathId) {
      const existing = findOrThrow(await spec.find(pathId), spec.label);
      assertRecordScope(spec, user, existing);
      spec.guard?.(data, existing);
      const persisted = (await spec.update(data, existing, user)) ?? data;
      broadcast([spec.table]);
      res.json({ entity: persisted });
      return;
    }

    const existing = await spec.find(spec.idOf(data));
    if (existing) throw new HttpError(409, 'ALREADY_EXISTS', `${spec.label} ${spec.idOf(data)} already exists.`);
    spec.onCreate?.(data, user);
    const persisted = (await spec.create(data, user)) ?? data;
    broadcast([spec.table]);
    res.status(201).json({ entity: persisted });
  });
}

const prisma = () => getPrisma();

const applicationSpec: SaveSpec<Application> = {
  table: 'applications',
  label: 'Application',
  permissions: ['applications.create', 'applications.review'],
  parse: parseApplication,
  idOf: (app) => app.id,
  scopeOf: (app) => ({ region: app.region, instituteId: app.instituteId }),
  find: async (id) => {
    const row = await prisma().application.findUnique({ where: { id } });
    return row ? toApplication(row) : null;
  },
  onCreate: (app) => {
    if (app.stage !== 'Submitted') {
      throw new HttpError(
        403,
        'REGULATED_FIELD',
        'New applications must start at the Submitted stage.'
      );
    }
    if (app.decision) {
      throw new HttpError(403, 'REGULATED_FIELD', 'A decision can only be recorded by an authority.');
    }
  },
  create: async (app) => {
    await prisma().application.create({ data: toApplicationData({ ...app, version: 1 }) });
  },
  update: async (app, existing) => {
    if (app.stage !== existing.stage || app.status !== existing.status) {
      throw new HttpError(
        403,
        'REGULATED_FIELD',
        'Stage, status and decisions change through a regulated workflow action.'
      );
    }
    const { id, ...rest } = toApplicationData(app);
    const result = await prisma().application.updateMany({
      where: { id, version: existing.version },
      data: { ...rest, version: existing.version }
    });
    if (result.count === 0) {
      throw new HttpError(
        409,
        'VERSION_CONFLICT',
        'This application changed since it was loaded. Refresh and try again.'
      );
    }
  },
  guard: (app, existing) => {
    assertUnchanged(
      app as unknown as Record<string, unknown>,
      existing as unknown as Record<string, unknown>,
      ['stage', 'status', 'decision', 'timeline']
    );
  }
};

const evcSpec: SaveSpec<EVCVisit> = {
  table: 'evcVisits',
  label: 'EVC visit',
  permissions: ['evc.schedule', 'evc.report.submit'],
  parse: parseEVCVisit,
  idOf: (visit) => visit.id,
  scopeOf: (visit) => ({ region: visit.region, instituteId: visit.instituteId }),
  find: async (id) => {
    const row = await prisma().eVCVisit.findUnique({ where: { id } });
    return row ? toEVCVisit(row) : null;
  },
  create: async (visit) => {
    await prisma().eVCVisit.create({ data: toEVCVisitData(visit) });
  },
  update: async (visit) => {
    await prisma().eVCVisit.update({ where: { id: visit.id }, data: toEVCVisitData(visit) });
  }
};

const complianceSpec: SaveSpec<ComplianceRecord> = {
  table: 'complianceRecords',
  label: 'Compliance record',
  permissions: ['compliance.submit', 'compliance.verify'],
  parse: parseComplianceRecord,
  idOf: (record) => record.id,
  scopeOf: (record) => ({ region: record.region, instituteId: record.instituteId }),
  find: async (id) => {
    const row = await prisma().complianceRecord.findUnique({ where: { id } });
    return row ? toComplianceRecord(row) : null;
  },
  guard: (record) => {
    if (record.status === 'Verified') {
      throw new HttpError(
        403,
        'REGULATED_FIELD',
        'Compliance records are verified through the verification endpoint.'
      );
    }
  },
  create: async (record) => {
    const stamped = { ...record, verifiedAt: undefined, verifiedBy: undefined };
    await prisma().complianceRecord.create({ data: toComplianceRecordData(stamped) });
    return stamped;
  },
  update: async (record, existing) => {
    const stamped = {
      ...record,
      verifiedAt: existing.verifiedAt,
      verifiedBy: existing.verifiedBy
    };
    await prisma().complianceRecord.update({
      where: { id: record.id },
      data: toComplianceRecordData(stamped)
    });
    return stamped;
  }
};

const documentSpec: SaveSpec<DocumentItem> = {
  table: 'documents',
  label: 'Document',
  permissions: ['documents.upload', 'documents.verify'],
  parse: parseDocumentItem,
  idOf: (document) => document.id,
  scopeOf: (document) => ({ region: document.region, instituteId: document.instituteId }),
  find: async (id) => {
    const row = await prisma().documentItem.findUnique({ where: { id } });
    return row ? toDocumentItem(row) : null;
  },
  guard: (document) => {
    if (document.status === 'Verified') {
      throw new HttpError(
        403,
        'REGULATED_FIELD',
        'Documents are verified through the verification endpoint.'
      );
    }
  },
  create: async (document) => {
    const stamped = { ...document, verifiedBy: undefined };
    await prisma().documentItem.create({ data: toDocumentItemData(stamped) });
    return stamped;
  },
  update: async (document, existing) => {
    const stamped = { ...document, verifiedBy: existing.verifiedBy };
    await prisma().documentItem.update({
      where: { id: document.id },
      data: toDocumentItemData(stamped)
    });
    return stamped;
  }
};

const undertakingSpec: SaveSpec<Undertaking> = {
  table: 'undertakings',
  label: 'Undertaking',
  permissions: ['applications.review', 'compliance.verify', 'compliance.submit'],
  parse: parseUndertaking,
  idOf: (undertaking) => undertaking.id,
  scopeOf: (undertaking) => ({
    region: undertaking.region,
    instituteId: undertaking.instituteId
  }),
  find: async (id) => {
    const row = await prisma().undertaking.findUnique({ where: { id } });
    return row ? toUndertaking(row) : null;
  },
  guard: (undertaking) => {
    if (undertaking.status === 'Verified' || undertaking.status === 'Rejected') {
      throw new HttpError(
        403,
        'REGULATED_FIELD',
        'Undertakings are verified through the verification endpoint.'
      );
    }
  },
  create: async (undertaking, user) => {
    const stamped = {
      ...undertaking,
      submittedBy: undertaking.submittedAt ? user.name : undefined,
      verifiedAt: undefined,
      verifiedBy: undefined
    };
    await prisma().undertaking.create({ data: toUndertakingData(stamped) });
    return stamped;
  },
  update: async (undertaking, existing, user) => {
    const stamped = {
      ...undertaking,
      submittedBy: undertaking.submittedAt ? existing.submittedBy ?? user.name : existing.submittedBy,
      verifiedAt: existing.verifiedAt,
      verifiedBy: existing.verifiedBy
    };
    await prisma().undertaking.update({
      where: { id: undertaking.id },
      data: toUndertakingData(stamped)
    });
    return stamped;
  }
};

const notificationSpec: SaveSpec<NotificationItem> = {
  table: 'notifications',
  label: 'Notification',
  permissions: [],
  parse: parseNotification,
  idOf: (notification) => notification.id,
  scopeOf: (notification) => ({
    region: notification.targetRegion,
    instituteId: notification.targetInstituteId
  }),
  scopeMode: 'present',
  find: async (id) => {
    const row = await prisma().notificationItem.findUnique({ where: { id } });
    return row ? toNotification(row) : null;
  },
  create: async (notification) => {
    // The client sweep re-emits the same event from every session; dedupeKey makes POST idempotent.
    const existing = notification.dedupeKey
      ? await prisma().notificationItem.findFirst({ where: { dedupeKey: notification.dedupeKey } })
      : null;
    if (existing) return toNotification(existing);
    await prisma().notificationItem.create({ data: toNotificationData(notification) });
  },
  update: async (notification) => {
    await prisma().notificationItem.update({
      where: { id: notification.id },
      data: toNotificationData(notification)
    });
  }
};

const alertSpec: SaveSpec<SystemAlert> = {
  table: 'alerts',
  label: 'Alert',
  permissions: [],
  parse: parseSystemAlert,
  idOf: (alert) => alert.id,
  scopeOf: (alert) => ({ region: alert.region, instituteId: alert.instituteId }),
  scopeMode: 'present',
  find: async (id) => {
    const row = await prisma().systemAlert.findUnique({ where: { id } });
    return row ? toSystemAlert(row) : null;
  },
  create: async (alert) => {
    // dedupeKey is the stable identity of a deadline condition; a second sweep must not fail.
    const existing = await prisma().systemAlert.findUnique({ where: { dedupeKey: alert.dedupeKey } });
    if (existing) return toSystemAlert(existing);
    await prisma().systemAlert.create({ data: toSystemAlertData(alert) });
  },
  update: async (alert) => {
    await prisma().systemAlert.update({ where: { id: alert.id }, data: toSystemAlertData(alert) });
  }
};

const escalationSpec: SaveSpec<EscalationItem> = {
  table: 'escalations',
  label: 'Escalation',
  permissions: [],
  parse: parseEscalation,
  idOf: (escalation) => escalation.id,
  scopeOf: (escalation) => ({ region: escalation.region }),
  find: async (id) => {
    const row = await prisma().escalationItem.findUnique({ where: { id } });
    return row ? toEscalation(row) : null;
  },
  create: async (escalation, user) => {
    if (escalation.dedupeKey) {
      const open = await prisma().escalationItem.findFirst({
        where: { dedupeKey: escalation.dedupeKey, status: { not: 'Resolved' } }
      });
      if (open) return toEscalation(open);
    }
    const acknowledged = escalation.status !== 'Open';
    const stamped = {
      ...escalation,
      raisedBy: escalation.raisedBy === AUTOMATED_RAISER ? AUTOMATED_RAISER : user.name,
      acknowledgedBy: acknowledged ? user.name : undefined,
      acknowledgedAt: acknowledged ? nowStamp() : undefined,
      resolvedAt: escalation.status === 'Resolved' ? nowStamp() : undefined
    };
    await prisma().escalationItem.create({ data: toEscalationData(stamped) });
    return stamped;
  },
  update: async (escalation, existing, user) => {
    const acknowledged = escalation.status !== 'Open';
    const stamped = {
      ...escalation,
      raisedBy: existing.raisedBy,
      acknowledgedBy: acknowledged ? existing.acknowledgedBy ?? user.name : undefined,
      acknowledgedAt: acknowledged ? existing.acknowledgedAt ?? nowStamp() : undefined,
      resolvedAt: escalation.status === 'Resolved' ? existing.resolvedAt ?? nowStamp() : undefined
    };
    await prisma().escalationItem.update({
      where: { id: escalation.id },
      data: toEscalationData(stamped)
    });
    return stamped;
  }
};

dataRouter.post('/applications', saveHandler(applicationSpec));
dataRouter.put('/applications/:id', saveHandler(applicationSpec));
dataRouter.post('/evc-visits', saveHandler(evcSpec));
dataRouter.put('/evc-visits/:id', saveHandler(evcSpec));
dataRouter.post('/compliance', saveHandler(complianceSpec));
dataRouter.put('/compliance/:id', saveHandler(complianceSpec));
dataRouter.post('/documents', saveHandler(documentSpec));
dataRouter.put('/documents/:id', saveHandler(documentSpec));
dataRouter.post('/undertakings', saveHandler(undertakingSpec));
dataRouter.put('/undertakings/:id', saveHandler(undertakingSpec));
dataRouter.post('/notifications', saveHandler(notificationSpec));
dataRouter.put('/notifications/:id', saveHandler(notificationSpec));
dataRouter.post('/alerts', saveHandler(alertSpec));
dataRouter.put('/alerts/:id', saveHandler(alertSpec));
dataRouter.post('/escalations', saveHandler(escalationSpec));
dataRouter.put('/escalations/:id', saveHandler(escalationSpec));

dataRouter.get(
  '/snapshot',
  asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const db = prisma();

    const [
      applicationRows,
      instituteRows,
      visitRows,
      complianceRows,
      documentRows,
      notificationRows,
      undertakingRows,
      alertRows,
      escalationRows,
      userRows,
      roleRows,
      configRow,
      auditRows
    ] = await Promise.all([
      db.application.findMany(),
      db.institute.findMany({ orderBy: { name: 'asc' } }),
      db.eVCVisit.findMany({ orderBy: { date: 'asc' } }),
      db.complianceRecord.findMany({ orderBy: { dueDate: 'asc' } }),
      db.documentItem.findMany(),
      db.notificationItem.findMany({ orderBy: { timestamp: 'desc' } }),
      db.undertaking.findMany(),
      db.systemAlert.findMany(),
      db.escalationItem.findMany(),
      db.user.findMany({ orderBy: { name: 'asc' } }),
      db.rolePermission.findMany(),
      db.systemConfig.findUnique({ where: { id: 'default' } }),
      hasPermission(user, 'audit.read')
        ? db.auditLog.findMany({ orderBy: { id: 'desc' }, take: 200 })
        : Promise.resolve([])
    ]);

    const escalations = isCentral(user)
      ? escalationRows.map(toEscalation)
      : escalationRows
          .map(toEscalation)
          .filter(
            (item) =>
              user.role === 'REGIONAL_OFFICER' &&
              Boolean(user.region) &&
              item.region.toLowerCase() === user.region!.toLowerCase()
          );

    const users = hasPermission(user, 'users.read')
      ? userRows.map(toUser)
      : userRows.filter((row) => row.id === user.id).map(toUser);

    const rolePermissions = hasPermission(user, 'roles.manage')
      ? roleRows.map(toRolePermissions)
      : [];

    res.json({
      applications: filterApplicationsForUser(applicationRows.map(toApplication), user),
      institutes: filterInstitutesForUser(instituteRows.map(toInstitute), user),
      evcVisits: filterEVCVisitsForUser(visitRows.map(toEVCVisit), user),
      complianceRecords: filterComplianceForUser(complianceRows.map(toComplianceRecord), user),
      documents: filterDocumentsForUser(documentRows.map(toDocumentItem), user),
      notifications: filterNotificationsForUser(notificationRows.map(toNotification), user),
      undertakings: filterUndertakingsForUser(undertakingRows.map(toUndertaking), user),
      alerts: filterAlertsForUser(alertRows.map(toSystemAlert), user),
      escalations,
      auditLogs: auditRows.map(toAuditLog),
      users,
      rolePermissions,
      config: configRow ? toSystemConfig(configRow) : null
    });
  })
);

const AUDIT_ENTITY_TYPES = [
  'Application',
  'User',
  'EVC',
  'Compliance',
  'Document',
  'System',
  'Auth',
  'Undertaking',
  'Alert',
  'Escalation'
] as const;
const AUDIT_SOURCES = ['ui', 'system', 'cron'] as const;

function enumField<T extends string>(
  body: Record<string, unknown>,
  field: string,
  allowed: readonly T[]
): T {
  const value = body[field];
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new HttpError(400, 'INVALID_BODY', `${field} must be one of: ${allowed.join(', ')}.`);
  }
  return value as T;
}

dataRouter.post(
  '/audit',
  asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const body = requireObject(req.body);
    const draft: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole' | 'ipAddress'> = {
      action: requireString(body.action, 'action', { max: 200 }),
      entityType: enumField(body, 'entityType', AUDIT_ENTITY_TYPES),
      entityId: requireString(body.entityId, 'entityId', { max: 200 }),
      details: requireString(body.details, 'details', { max: 5000 }),
      previousState: optionalString(body.previousState, 'previousState', 1000),
      newState: optionalString(body.newState, 'newState', 1000),
      eventType: optionalString(body.eventType, 'eventType', 100),
      correlationId: optionalString(body.correlationId, 'correlationId', 100),
      source: body.source === undefined ? 'ui' : enumField(body, 'source', AUDIT_SOURCES)
    };

    const audit = await writeAudit(
      prisma(),
      { id: user.id, name: user.name, role: user.role },
      draft,
      clientIp(req)
    );
    broadcast(['auditLogs']);
    res.status(201).json({ audit });
  })
);

dataRouter.put(
  '/config',
  asyncHandler(async (req: Request, res: Response) => {
    assertAnyPermission(req, ['system.config']);
    const config = parseSystemConfig(requireObject(req.body));
    const data = toSystemConfigData(config);
    await prisma().systemConfig.upsert({
      where: { id: 'default' },
      create: data,
      update: data
    });
    broadcast(['config']);
    res.json({ config });
  })
);

dataRouter.post(
  '/admin/reset',
  asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    if (user.role !== 'SUPER_ADMIN') {
      throw new HttpError(403, 'FORBIDDEN', 'Only a super administrator may reset the dataset.');
    }
    if (process.env.ALLOW_DEMO_RESET !== '1') {
      throw new HttpError(403, 'RESET_DISABLED', 'Dataset reset is disabled in this environment.');
    }

    await clearDatabase(prisma());
    await seedDatabase(prisma());
    await writeAudit(prisma(), { id: user.id, name: user.name, role: user.role }, {
      action: 'DATABASE_RESET',
      entityType: 'System',
      entityId: 'default',
      details: 'The seeded demonstration dataset was reset by a super administrator.'
    }, clientIp(req));

    broadcast([
      'applications',
      'evcVisits',
      'complianceRecords',
      'documents',
      'undertakings',
      'notifications',
      'alerts',
      'escalations',
      'auditLogs',
      'config',
      'users',
      'rolePermissions'
    ]);

    clearSessionCookie(res);
    res.json({ ok: true });
  })
);
