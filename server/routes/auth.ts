import { Router } from 'express';
import { asyncHandler, HttpError } from '../http.ts';
import { isDatabaseConfigured, getPrisma } from '../db.ts';
import { hashPassword, verifyPassword } from '../password.ts';
import {
  checkLoginRate,
  clearLoginRate,
  clientIp,
  loginRateKey,
  recordLoginFailure
} from '../rateLimit.ts';
import { requireObject, requireString } from '../validate.ts';
import {
  clearSessionCookie,
  createSession,
  hashToken,
  readCookie,
  resolveSession,
  SESSION_COOKIE,
  setSessionCookie
} from '../session.ts';
import { writeAudit } from '../audit.ts';
import { toUser } from '../mappers/admin.ts';
import type { AuditActor } from '../audit.ts';
import type { User as UserRow } from '@prisma/client';

// Verifying against a real hash keeps the "unknown email" path as slow as a wrong password.
const DUMMY_PASSWORD_HASH = hashPassword('apoorvasetu-dummy-credential');

function requireDatabase(): void {
  if (!isDatabaseConfigured()) {
    throw new HttpError(503, 'DATABASE_UNCONFIGURED', 'The database is not configured.');
  }
}

function actorFor(user: UserRow): AuditActor {
  return { id: user.id, name: user.name, role: user.role as AuditActor['role'] };
}

export const authRouter = Router();

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    requireDatabase();

    const body = requireObject(req.body);
    const email = requireString(body.email, 'email', { min: 3, max: 320 }).toLowerCase();
    const password = requireString(body.password, 'password', { min: 1, max: 200 });
    const rememberMe = body.rememberMe === true;

    const rateKey = loginRateKey(req, email);
    const rate = checkLoginRate(rateKey);
    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfterSeconds));
      throw new HttpError(
        429,
        'RATE_LIMITED',
        'Too many sign-in attempts. Please wait before trying again.'
      );
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { email } });
    const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

    if (!user || !passwordOk) {
      recordLoginFailure(rateKey);
      if (user) {
        await writeAudit(
          prisma,
          actorFor(user),
          {
            action: 'FAILED_LOGIN_BAD_PASSWORD',
            entityType: 'Auth',
            entityId: user.id,
            details: `Failed authentication attempt for ${user.email}: incorrect password supplied.`
          },
          clientIp(req)
        );
      }
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    if (!user.isActive) {
      await writeAudit(
        prisma,
        actorFor(user),
        {
          action: 'LOGIN_BLOCKED_INACTIVE',
          entityType: 'Auth',
          entityId: user.id,
          details: `Login rejected: account ${user.email} has been deactivated by administrator.`
        },
        clientIp(req)
      );
      throw new HttpError(403, 'ACCOUNT_INACTIVE', 'This account has been deactivated.');
    }

    clearLoginRate(rateKey);

    const session = await createSession(user.id, rememberMe, {
      ip: clientIp(req),
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined
    });

    const lastLogin = new Date().toISOString();
    await prisma.user.update({ where: { id: user.id }, data: { lastLogin } });

    setSessionCookie(res, session.token, session.expiresAt);

    await writeAudit(
      prisma,
      actorFor(user),
      {
        action: 'USER_LOGIN_SUCCESS',
        entityType: 'Auth',
        entityId: user.id,
        details: `User ${user.name} authenticated successfully with role ${user.roleTitle} (Session: ${session.id}).`
      },
      clientIp(req)
    );

    res.json({
      user: toUser({ ...user, lastLogin }),
      expiresAt: session.expiresAt.toISOString()
    });
  })
);

authRouter.get(
  '/session',
  asyncHandler(async (req, res) => {
    requireDatabase();

    const resolved = await resolveSession(req);
    if (!resolved) {
      res.json({ user: null, expiresAt: null });
      return;
    }

    res.json({
      user: toUser(resolved.user),
      expiresAt: resolved.session.expiresAt.toISOString()
    });
  })
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    if (isDatabaseConfigured()) {
      const token = readCookie(req, SESSION_COOKIE);
      if (token) {
        const prisma = getPrisma();
        const session = await prisma.session.findUnique({
          where: { tokenHash: hashToken(token) },
          include: { user: true }
        });
        if (session && !session.revokedAt) {
          await prisma.session.update({
            where: { id: session.id },
            data: { revokedAt: new Date() }
          });
          await writeAudit(
            prisma,
            actorFor(session.user),
            {
              action: 'USER_LOGOUT',
              entityType: 'Auth',
              entityId: session.id,
              details: `Active session ${session.id} was explicitly terminated and revoked.`
            },
            clientIp(req)
          );
        }
      }
    }

    clearSessionCookie(res);
    res.status(204).end();
  })
);
