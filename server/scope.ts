import type { NextFunction, Request, Response } from 'express';
import type { Permission, User } from '../src/types/index.ts';
import { hasPermission } from '../src/services/rbacService.ts';
import { HttpError } from './http.ts';

export interface ScopedEntity {
  region?: string | null;
  instituteId?: string | null;
}

export function requireUser(req: Request): User {
  if (!req.auth) throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  return req.auth.user;
}

export function assertAnyPermission(req: Request, permissions: readonly Permission[]): User {
  const user = requireUser(req);
  if (permissions.some((permission) => hasPermission(user, permission))) return user;
  throw new HttpError(
    403,
    'FORBIDDEN',
    `You need one of these permissions: ${permissions.join(', ')}.`
  );
}

export function assertPermission(req: Request, permission: Permission): User {
  const user = requireUser(req);
  if (!hasPermission(user, permission)) {
    throw new HttpError(403, 'FORBIDDEN', `You do not have the '${permission}' permission.`);
  }
  return user;
}

export function requireAnyPermission(permissions: readonly Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      assertAnyPermission(req, permissions);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function isCentral(user: User): boolean {
  return user.role === 'SUPER_ADMIN' || user.role === 'AICTE_ADMIN';
}

export function canAccessRegion(user: User, region: string | null | undefined): boolean {
  if (isCentral(user)) return true;
  if (!region || !user.region) return false;
  return region.toLowerCase() === user.region.toLowerCase();
}

export function canAccessInstitute(user: User, instituteId: string | null | undefined): boolean {
  if (isCentral(user)) return true;
  if (user.role !== 'INSTITUTION_ADMIN') return true;
  if (!instituteId || !user.instituteId) return false;
  return instituteId === user.instituteId;
}

export function assertScope(user: User, entity: ScopedEntity): void {
  if (isCentral(user)) return;
  if (user.role === 'INSTITUTION_ADMIN') {
    if (!canAccessInstitute(user, entity.instituteId)) {
      throw new HttpError(403, 'SCOPE_DENIED', 'This record belongs to another institution.');
    }
    return;
  }
  if (user.role === 'REGIONAL_OFFICER' || user.role === 'EVC_MEMBER') {
    if (!canAccessRegion(user, entity.region)) {
      throw new HttpError(
        403,
        'SCOPE_DENIED',
        'This record is outside your regional jurisdiction.'
      );
    }
    return;
  }
  throw new HttpError(403, 'SCOPE_DENIED', 'This record is outside your jurisdiction.');
}

/** Scope check for broadcast-style records that may carry no jurisdiction at all. */
export function assertPresentScope(user: User, entity: ScopedEntity): void {
  if (isCentral(user)) return;
  if (entity.region != null && !canAccessRegion(user, entity.region)) {
    throw new HttpError(403, 'SCOPE_DENIED', 'This record is outside your regional jurisdiction.');
  }
  if (entity.instituteId != null && !canAccessInstitute(user, entity.instituteId)) {
    throw new HttpError(403, 'SCOPE_DENIED', 'This record belongs to another institution.');
  }
}

export function stripFields<T extends Record<string, unknown>>(
  body: T,
  fields: readonly string[]
): T {
  const copy = { ...body };
  for (const field of fields) delete copy[field];
  return copy;
}

export function assertUnchanged(
  body: Record<string, unknown>,
  current: Record<string, unknown>,
  fields: readonly string[]
): void {
  for (const field of fields) {
    const next = body[field];
    if (next === undefined) continue;
    if (JSON.stringify(next) !== JSON.stringify(current[field])) {
      throw new HttpError(
        403,
        'REGULATED_FIELD',
        `'${field}' can only change through a regulated workflow action.`
      );
    }
  }
}
