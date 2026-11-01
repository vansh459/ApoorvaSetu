import { Router } from 'express';
import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import type {
  Application,
  DocumentItem
} from '../../src/types/index.ts';
import { applyTransition } from '../../src/workflow/engine.ts';
import type { TransitionDenialCode, TransitionRequest } from '../../src/workflow/types.ts';
import { getNow, toIsoDate } from '../../src/utils/dates.ts';
import { writeAudit } from '../audit.ts';
import { getPrisma } from '../db.ts';
import { actorFromUser, loadWorkflowContext } from '../domain.ts';
import { broadcast } from '../events.ts';
import { asyncHandler, HttpError } from '../http.ts';
import {
  toApplication,
  toApplicationData,
  toComplianceRecord,
  toDocumentItem,
  toUndertaking
} from '../mappers/index.ts';
import { parseTransition } from '../payload.ts';
import { clientIp } from '../rateLimit.ts';
import { assertScope, assertAnyPermission, requireUser } from '../scope.ts';
import { requireSession } from '../session.ts';
import { requireString } from '../validate.ts';

export const workflowRouter = Router();
workflowRouter.use(requireSession);

const DENIAL_STATUS: Record<TransitionDenialCode, number> = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  INVALID_STAGE: 400,
  STAGE_SKIP: 400,
  NO_NEXT_STAGE: 409,
  OPEN_DEFICIENCIES: 409,
  EVC_INCOMPLETE: 409,
  UNDERTAKING_PENDING: 409,
  VERSION_CONFLICT: 409,
  NOT_AUTHORITY_STAGE: 403,
  REASON_REQUIRED: 400,
  ALREADY_TERMINAL: 409,
  NOT_RETURNED: 409
};

function paramId(req: Request): string {
  const value = req.params.id;
  if (typeof value !== 'string' || !value) {
    throw new HttpError(400, 'INVALID_BODY', 'A resource id is required.');
  }
  return value;
}

async function loadApplication(
  client: Prisma.TransactionClient,
  id: string
): Promise<Application> {
  const row = await client.application.findUnique({ where: { id } });
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Application was not found.');
  return toApplication(row);
}

workflowRouter.post(
  '/applications/:id/transitions',
  asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const appId = paramId(req);
    const draft = parseTransition(req.body ?? {});

    const prisma = getPrisma();
    const existing = await loadApplication(prisma, appId);
    assertScope(user, { region: existing.region, instituteId: existing.instituteId });

    const actor = actorFromUser(user);
    const request: TransitionRequest = {
      ...draft,
      actor,
      competentAuthority: `${user.name} (${user.role})`
    };

    const outcome = await prisma.$transaction(async (tx) => {
      const app = await loadApplication(tx, appId);
      const ctx = await loadWorkflowContext(tx, app);
      const result = applyTransition(app, request, ctx);
      if (!result.ok || !result.app) return { result };

      const updated = result.app;
      const expectedVersion = draft.expectedVersion ?? app.version ?? 1;
      const { id, ...rest } = toApplicationData(updated);
      const write = await tx.application.updateMany({
        where: { id, version: expectedVersion },
        data: { ...rest, version: updated.version }
      });
      if (write.count === 0) {
        return {
          result: {
            ok: false,
            code: 'VERSION_CONFLICT' as const,
            message: 'This case was updated by another officer. Reload before acting.',
            events: [],
            audit: []
          }
        };
      }

      const audits = [];
      for (const entry of result.audit) {
        audits.push(await writeAudit(tx, actor, entry, clientIp(req)));
      }

      return { result, app: updated, audits };
    });

    if (!outcome.result.ok || !outcome.app) {
      const code = outcome.result.code ?? 'INVALID_STAGE';
      throw new HttpError(
        DENIAL_STATUS[code] ?? 409,
        code,
        outcome.result.message ?? 'This action is not permitted.'
      );
    }

    broadcast(['applications', 'auditLogs']);
    res.json({
      ok: true,
      application: outcome.app,
      events: outcome.result.events,
      audits: outcome.audits
    });
  })
);

type ProtectedField = 'verifiedBy' | 'verifiedAt';

function rejectProtected(body: Record<string, unknown>): void {
  const protectedFields: ProtectedField[] = ['verifiedBy', 'verifiedAt'];
  for (const field of protectedFields) {
    if (body[field] !== undefined) {
      throw new HttpError(
        403,
        'REGULATED_FIELD',
        `${field} is stamped from the authenticated session and cannot be supplied.`
      );
    }
  }
}

function bodyOf(req: Request): Record<string, unknown> {
  const body = req.body;
  return body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

workflowRouter.post(
  '/compliance/:id/verify',
  asyncHandler(async (req: Request, res: Response) => {
    const user = assertAnyPermission(req, ['compliance.verify']);
    const body = bodyOf(req);
    rejectProtected(body);
    const prisma = getPrisma();
    const id = paramId(req);

    const outcome = await prisma.$transaction(async (tx) => {
      const row = await tx.complianceRecord.findUnique({ where: { id } });
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Compliance record was not found.');
      const record = toComplianceRecord(row);
      assertScope(user, { region: record.region, instituteId: record.instituteId });
      if (record.status === 'Verified') return { entity: record, audit: undefined };

      const verified = await tx.complianceRecord.update({
        where: { id },
        data: {
          status: 'Verified',
          urgency: 'low',
          verifiedAt: toIsoDate(getNow()),
          verifiedBy: user.name
        }
      });
      const entity = toComplianceRecord(verified);
      const audit = await writeAudit(tx, actorFromUser(user), {
        action: 'VERIFY_COMPLIANCE',
        entityType: 'Compliance',
        entityId: id,
        details: `Compliance record ${id} verified by ${user.name}`,
        previousState: JSON.stringify({ status: record.status }),
        newState: JSON.stringify({ status: 'Verified', verifiedBy: user.name }),
        eventType: 'compliance.verified',
        source: 'ui'
      }, clientIp(req));
      return { entity, audit };
    });

    if (outcome.audit) broadcast(['complianceRecords', 'auditLogs']);
    res.json({ ok: true, entity: outcome.entity, audit: outcome.audit });
  })
);

workflowRouter.post(
  '/undertakings/:id/verify',
  asyncHandler(async (req: Request, res: Response) => {
    const user = assertAnyPermission(req, ['compliance.verify']);
    const body = bodyOf(req);
    rejectProtected(body);
    const rejecting = body.outcome === 'reject';
    const reason = rejecting
      ? requireString(body.reason, 'reason', { max: 2000 })
      : undefined;
    const prisma = getPrisma();
    const id = paramId(req);

    const outcome = await prisma.$transaction(async (tx) => {
      const row = await tx.undertaking.findUnique({ where: { id } });
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Undertaking was not found.');
      const undertaking = toUndertaking(row);
      assertScope(user, { region: undertaking.region, instituteId: undertaking.instituteId });
      if (undertaking.status !== 'Submitted') {
        throw new HttpError(
          409,
          'INVALID_STATE',
          'Evidence must be submitted before the undertaking can be decided.'
        );
      }

      const decided = await tx.undertaking.update({
        where: { id },
        data: rejecting
          ? {
              status: 'Rejected',
              rejectionReason: reason,
              verifiedAt: toIsoDate(getNow()),
              verifiedBy: user.name
            }
          : {
              status: 'Verified',
              verifiedAt: toIsoDate(getNow()),
              verifiedBy: user.name,
              escalationLevel: 0
            }
      });
      const entity = toUndertaking(decided);
      const audit = await writeAudit(tx, actorFromUser(user), {
        action: rejecting ? 'REJECT_UNDERTAKING' : 'VERIFY_UNDERTAKING',
        entityType: 'Undertaking',
        entityId: id,
        details: rejecting
          ? `Undertaking ${id} evidence rejected by ${user.name}: ${reason}`
          : `Undertaking ${id} verified by ${user.name}; the case is cleared for final approval.`,
        previousState: JSON.stringify({
          status: undertaking.status,
          escalationLevel: undertaking.escalationLevel
        }),
        newState: JSON.stringify({
          status: entity.status,
          verifiedBy: user.name,
          rejectionReason: entity.rejectionReason
        }),
        eventType: rejecting ? 'undertaking.rejected' : 'undertaking.verified',
        source: 'ui'
      }, clientIp(req));
      return { entity, audit };
    });

    broadcast(['undertakings', 'auditLogs']);
    res.json({ ok: true, entity: outcome.entity, audit: outcome.audit });
  })
);

workflowRouter.post(
  '/documents/:id/verify',
  asyncHandler(async (req: Request, res: Response) => {
    const user = assertAnyPermission(req, ['documents.verify']);
    const body = bodyOf(req);
    rejectProtected(body);
    const prisma = getPrisma();
    const id = paramId(req);

    const outcome = await prisma.$transaction(async (tx) => {
      const row = await tx.documentItem.findUnique({ where: { id } });
      if (!row) throw new HttpError(404, 'NOT_FOUND', 'Document was not found.');
      const document = toDocumentItem(row);
      assertScope(user, { region: document.region, instituteId: document.instituteId });
      if (document.status !== 'Pending') {
        throw new HttpError(
          409,
          'INVALID_STATE',
          'Only documents pending verification can be verified.'
        );
      }

      const verified = await tx.documentItem.update({
        where: { id },
        data: {
          status: 'Verified',
          verifiedBy: user.name,
          renewalStatus: document.renewalOfId ? 'Verified' : row.renewalStatus
        }
      });
      const entity = toDocumentItem(verified);

      let predecessor: DocumentItem | undefined;
      if (document.renewalOfId) {
        const previous = await tx.documentItem.findUnique({
          where: { id: document.renewalOfId }
        });
        if (previous) {
          predecessor = toDocumentItem(
            await tx.documentItem.update({
              where: { id: previous.id },
              data: {
                status: 'Superseded',
                renewalStatus: 'Verified',
                verifiedBy: user.name
              }
            })
          );
        }
      }

      const audit = await writeAudit(tx, actorFromUser(user), {
        action: 'VERIFY_DOCUMENT',
        entityType: 'Document',
        entityId: id,
        details: predecessor
          ? `Renewal verified by ${user.name}; ${predecessor.id} superseded by ${id}.`
          : `Document verified by ${user.name}.`,
        previousState: JSON.stringify({ status: document.status }),
        newState: JSON.stringify({
          status: entity.status,
          verifiedBy: user.name,
          supersededId: predecessor?.id
        }),
        eventType: predecessor ? 'document.renewal_verified' : 'document.verified',
        source: 'ui'
      }, clientIp(req));
      return { entity, predecessor, audit };
    });

    broadcast(['documents', 'auditLogs']);
    res.json({
      ok: true,
      entity: outcome.entity,
      predecessor: outcome.predecessor,
      audit: outcome.audit
    });
  })
);
