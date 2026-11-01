import { createHash, randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { Session as SessionRow, User as UserRow } from '@prisma/client';
import type { Permission, User } from '../src/types/index.ts';
import { getPrisma, isDatabaseConfigured } from './db.ts';
import { HttpError } from './http.ts';
import { toUser } from './mappers/admin.ts';

export const SESSION_COOKIE = 'apoorvasetu_sid';

const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;
const REMEMBER_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TOUCH_INTERVAL_MS = 60 * 1000;

export interface SessionMeta {
  ip?: string;
  userAgent?: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: {
        sessionId: string;
        user: User;
        userRow: UserRow;
      };
    }
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sessionTtlMs(rememberMe: boolean): number {
  return rememberMe ? REMEMBER_TTL_MS : DEFAULT_TTL_MS;
}

export function sessionExpiry(rememberMe: boolean, now: Date = new Date()): Date {
  return new Date(now.getTime() + sessionTtlMs(rememberMe));
}

function cookieSecure(): boolean {
  return process.env.COOKIE_SECURE === '1';
}

function baseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: cookieSecure(),
    path: '/'
  };
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (!name) continue;
    const raw = part.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(raw);
    } catch {
      cookies[name] = raw;
    }
  }

  return cookies;
}

export function readCookie(req: Request, name: string): string | undefined {
  return parseCookies(req.headers.cookie)[name];
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE, token, { ...baseCookieOptions(), expires: expiresAt });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, baseCookieOptions());
}

export interface CreatedSession {
  id: string;
  token: string;
  expiresAt: Date;
}

export async function createSession(
  userId: string,
  rememberMe: boolean,
  meta: SessionMeta = {}
): Promise<CreatedSession> {
  const token = createSessionToken();
  const expiresAt = sessionExpiry(rememberMe);
  const prisma = getPrisma();

  const session = await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      rememberMe,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null
    }
  });

  return { id: session.id, token, expiresAt };
}

export interface ResolvedSession {
  session: SessionRow;
  user: UserRow;
}

export async function resolveSession(req: Request): Promise<ResolvedSession | null> {
  if (!isDatabaseConfigured()) return null;

  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;

  const prisma = getPrisma();
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true }
  });
  if (!session) return null;

  const now = new Date();
  if (session.revokedAt || session.expiresAt.getTime() <= now.getTime()) return null;
  if (!session.user.isActive) return null;

  if (now.getTime() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: now } });
  }

  return { session, user: session.user };
}

export async function requireSession(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!isDatabaseConfigured()) {
      throw new HttpError(503, 'DATABASE_UNCONFIGURED', 'The database is not configured.');
    }
    const resolved = await resolveSession(req);
    if (!resolved) {
      throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
    }
    req.auth = {
      sessionId: resolved.session.id,
      user: toUser(resolved.user),
      userRow: resolved.user
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.auth?.user;
    if (!user) {
      next(new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.'));
      return;
    }
    if (!user.permissions.includes(permission)) {
      next(
        new HttpError(403, 'FORBIDDEN', `You do not have the '${permission}' permission.`)
      );
      return;
    }
    next();
  };
}
