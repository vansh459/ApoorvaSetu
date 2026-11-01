import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import type { Request, Response } from 'express';
import type { Permission, Region, User, UserRole } from '../../src/types/index.ts';
import {
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_LABELS
} from '../../src/services/rbacService.ts';
import { broadcast } from '../events.ts';
import { getPrisma } from '../db.ts';
import { writeAudit } from '../audit.ts';
import { asyncHandler, HttpError } from '../http.ts';
import { hashPassword } from '../password.ts';
import { requireSession } from '../session.ts';
import { clientIp } from '../rateLimit.ts';
import { assertAnyPermission } from '../scope.ts';
import { optionalString, requireObject, requireString } from '../validate.ts';
import { toRolePermissions, toUser } from '../mappers/admin.ts';
import { DEMO_PASSWORD } from '../../src/data/demoUsers.ts';

export const adminRouter = Router();
adminRouter.use(requireSession);

const ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'AICTE_ADMIN',
  'REGIONAL_OFFICER',
  'EVC_MEMBER',
  'INSTITUTION_ADMIN'
];

const REGIONS: Region[] = [
  'Northern',
  'Southern',
  'Eastern',
  'Western',
  'Central',
  'North Eastern',
  'Others'
];

const ALL_PERMISSIONS = Array.from(
  new Set(Object.values(ROLE_DEFAULT_PERMISSIONS).flat())
) as Permission[];

function roleField(body: Record<string, unknown>, field = 'role'): UserRole {
  const value = body[field];
  if (typeof value !== 'string' || !ROLES.includes(value as UserRole)) {
    throw new HttpError(400, 'INVALID_BODY', `${field} must be a known role.`);
  }
  return value as UserRole;
}

function regionField(body: Record<string, unknown>, field = 'region'): Region | undefined {
  const value = body[field];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !REGIONS.includes(value as Region)) {
    throw new HttpError(400, 'INVALID_BODY', `${field} must be a known region.`);
  }
  return value as Region;
}

function emailField(body: Record<string, unknown>): string {
  const email = requireString(body.email, 'email', { min: 3, max: 320 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'INVALID_BODY', 'email must be a valid email address.');
  }
  return email;
}

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function paramId(req: Request): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : value;
}

function auditActor(user: User) {
  return { id: user.id, name: user.name, role: user.role };
}

async function permissionSetFor(role: UserRole): Promise<Permission[]> {
  const row = await getPrisma().rolePermission.findUnique({ where: { role } });
  return row ? (row.permissions as Permission[]) : ROLE_DEFAULT_PERMISSIONS[role];
}

adminRouter.get(
  '/users',
  asyncHandler(async (req: Request, res: Response) => {
    assertAnyPermission(req, ['users.read']);
    const rows = await getPrisma().user.findMany({ orderBy: { name: 'asc' } });
    res.json({ users: rows.map(toUser) });
  })
);

adminRouter.post(
  '/users',
  asyncHandler(async (req: Request, res: Response) => {
    const actor = assertAnyPermission(req, ['users.create']);
    const body = requireObject(req.body);
    const email = emailField(body);
    const name = requireString(body.name, 'name', { max: 200 });
    const role = roleField(body);
    const password = optionalString(body.password, 'password', 200) ?? DEMO_PASSWORD;

    const prisma = getPrisma();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, 'EMAIL_IN_USE', 'That email address is already registered.');

    const permissions = await permissionSetFor(role);
    const row = await prisma.user.create({
      data: {
        id: `USR-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`,
        email,
        name,
        role,
        roleTitle: optionalString(body.roleTitle, 'roleTitle', 200) ?? ROLE_LABELS[role],
        permissions,
        initials: initialsFor(name),
        phone: optionalString(body.phone, 'phone', 40) ?? null,
        designation: optionalString(body.designation, 'designation', 200) ?? null,
        region: regionField(body) ?? null,
        instituteId: optionalString(body.instituteId, 'instituteId', 200) ?? null,
        instituteName: optionalString(body.instituteName, 'instituteName', 200) ?? null,
        committeeName: optionalString(body.committeeName, 'committeeName', 200) ?? null,
        isActive: body.isActive !== false,
        createdAt: new Date().toISOString(),
        passwordHash: hashPassword(password)
      }
    });

    await writeAudit(
      prisma,
      auditActor(actor),
      {
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: row.id,
        details: `Created ${row.name} (${row.email}) with role ${row.roleTitle}.`
      },
      clientIp(req)
    );

    broadcast(['users', 'auditLogs']);
    res.status(201).json({ user: toUser(row) });
  })
);

adminRouter.put(
  '/users/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const actor = assertAnyPermission(req, ['users.update']);
    const body = requireObject(req.body);
    const prisma = getPrisma();
    const existing = await prisma.user.findUnique({ where: { id: paramId(req) } });
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'User was not found.');

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = requireString(body.name, 'name', { max: 200 });
    if (body.email !== undefined) {
      const email = emailField(body);
      if (email !== existing.email) {
        const clash = await prisma.user.findUnique({ where: { email } });
        if (clash) throw new HttpError(409, 'EMAIL_IN_USE', 'That email address is already registered.');
      }
      data.email = email;
    }
    if (body.role !== undefined) {
      const role = roleField(body);
      data.role = role;
      data.roleTitle = optionalString(body.roleTitle, 'roleTitle', 200) ?? ROLE_LABELS[role];
      data.permissions = await permissionSetFor(role);
    }
    for (const field of ['phone', 'designation', 'instituteId', 'instituteName', 'committeeName'] as const) {
      if (body[field] !== undefined) data[field] = optionalString(body[field], field, 200) ?? null;
    }
    if (body.region !== undefined) data.region = regionField(body) ?? null;
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') {
        throw new HttpError(400, 'INVALID_BODY', 'isActive must be a boolean.');
      }
      data.isActive = body.isActive;
    }
    if (body.password !== undefined) {
      data.passwordHash = hashPassword(requireString(body.password, 'password', { min: 8, max: 200 }));
    }
    if (data.name !== undefined) data.initials = initialsFor(data.name as string);

    const updated = await prisma.user.update({ where: { id: existing.id }, data });

    await writeAudit(
      prisma,
      auditActor(actor),
      {
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: updated.id,
        details: `Updated account details for ${updated.name} (${updated.email}).`
      },
      clientIp(req)
    );

    broadcast(['users', 'auditLogs']);
    res.json({ user: toUser(updated) });
  })
);

adminRouter.post(
  '/users/:id/toggle',
  asyncHandler(async (req: Request, res: Response) => {
    const actor = assertAnyPermission(req, ['users.update']);
    const prisma = getPrisma();
    const existing = await prisma.user.findUnique({ where: { id: paramId(req) } });
    if (!existing) throw new HttpError(404, 'NOT_FOUND', 'User was not found.');
    if (existing.id === actor.id) {
      throw new HttpError(403, 'FORBIDDEN', 'You cannot deactivate your own account.');
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { isActive: !existing.isActive }
    });

    await writeAudit(
      prisma,
      auditActor(actor),
      {
        action: updated.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entityType: 'User',
        entityId: updated.id,
        details: `Account for ${updated.name} (${updated.email}) was ${
          updated.isActive ? 'activated' : 'deactivated'
        }.`
      },
      clientIp(req)
    );

    broadcast(['users', 'auditLogs']);
    res.json({ user: toUser(updated) });
  })
);

adminRouter.put(
  '/roles/:role/permissions',
  asyncHandler(async (req: Request, res: Response) => {
    assertAnyPermission(req, ['roles.manage']);
    const role = roleField({ role: req.params.role });
    const body = requireObject(req.body);
    const value = body.permissions;
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
      throw new HttpError(400, 'INVALID_BODY', 'permissions must be an array of permission names.');
    }
    const unknown = (value as string[]).filter((item) => !ALL_PERMISSIONS.includes(item as Permission));
    if (unknown.length) {
      throw new HttpError(400, 'INVALID_BODY', `Unknown permissions: ${unknown.join(', ')}.`);
    }
    const permissions = Array.from(new Set(value as Permission[]));

    const prisma = getPrisma();
    const row = await prisma.rolePermission.upsert({
      where: { role },
      create: { role, permissions },
      update: { permissions }
    });
    await prisma.user.updateMany({ where: { role }, data: { permissions } });

    broadcast(['rolePermissions', 'users']);
    res.json({ rolePermission: toRolePermissions(row) });
  })
);
