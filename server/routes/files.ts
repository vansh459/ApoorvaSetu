import express, { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { Permission, User } from '../../src/types/index.ts';
import { asyncHandler, HttpError } from '../http.ts';
import { getPrisma } from '../db.ts';
import { requireSession } from '../session.ts';
import { optionalString, requireObject, requireString } from '../validate.ts';
import { getStorage, maxUploadBytes } from '../storage/index.ts';
import { buildStorageKey, isStorageKey } from '../storage/keys.ts';

const ALLOWED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);
const DOWNLOAD_URL_TTL_SECONDS = 60;

const SCOPE_PERMISSIONS: Record<'document' | 'evidence', Permission> = {
  document: 'documents.upload',
  evidence: 'evc.report.submit'
};

function parseScope(value: unknown): 'document' | 'evidence' {
  if (value === undefined || value === null) return 'document';
  if (value === 'document' || value === 'evidence') return value;
  throw new HttpError(400, 'INVALID_BODY', 'scope must be "document" or "evidence".');
}

function requirePermission(user: User, permission: Permission): void {
  if (!user.permissions.includes(permission)) {
    throw new HttpError(403, 'FORBIDDEN', `You do not have the '${permission}' permission.`);
  }
}

function queryKey(req: Request): string {
  const raw = req.query.key;
  const key = typeof raw === 'string' ? raw : undefined;
  if (!key || !isStorageKey(key)) {
    throw new HttpError(400, 'INVALID_KEY', 'Invalid storage key.');
  }
  return key;
}

function canRead(user: User, uploaderId: string | null, scope: string): boolean {
  if (uploaderId === user.id) return true;
  // Document files open to verifying officers; inspection evidence to committee roles.
  return scope === 'evidence'
    ? user.permissions.includes('evc.read')
    : user.permissions.includes('documents.verify');
}

function rawBody(req: Request, res: Response, next: NextFunction): void {
  express.raw({ type: () => true, limit: maxUploadBytes() })(req, res, next);
}

export const filesRouter = Router();

filesRouter.use(requireSession);

filesRouter.post(
  '/files/presign',
  asyncHandler(async (req, res) => {
    const user = req.auth!.user;
    const body = requireObject(req.body);
    const scope = parseScope(body.scope);
    requirePermission(user, SCOPE_PERMISSIONS[scope]);

    const fileName = requireString(body.fileName, 'fileName', { min: 1, max: 180 });
    const contentType = requireString(body.contentType, 'contentType', { min: 3, max: 100 }).toLowerCase();
    const size = Number(body.size);

    if (!ALLOWED_TYPES.has(contentType)) {
      throw new HttpError(400, 'UNSUPPORTED_FILE_TYPE', 'Upload a PDF, PNG, JPG or WebP file.');
    }
    if (!Number.isFinite(size) || size <= 0) {
      throw new HttpError(400, 'INVALID_BODY', 'size must be a positive number of bytes.');
    }
    const limit = maxUploadBytes();
    if (size > limit) {
      throw new HttpError(
        413,
        'PAYLOAD_TOO_LARGE',
        `Files must be ${Math.floor(limit / (1024 * 1024))} MB or smaller.`
      );
    }

    const storage = getStorage();
    const key = buildStorageKey(user.id, fileName);
    const target = await storage.createUploadTarget({ key, contentType });

    await getPrisma().fileObject.create({
      data: {
        key,
        bucket: storage.bucket,
        scope,
        contentType,
        size: Math.round(size),
        uploaderId: user.id,
        documentId: optionalString(body.documentId, 'documentId', 80) ?? null
      }
    });

    res.status(201).json({
      key,
      uploadUrl: target.uploadUrl,
      method: target.method,
      headers: target.headers,
      maxBytes: limit
    });
  })
);

// Confirms a direct (Supabase) upload and records its real size.
filesRouter.post(
  '/files/complete',
  asyncHandler(async (req, res) => {
    const user = req.auth!.user;
    const body = requireObject(req.body);
    const key = requireString(body.key, 'key', { min: 1, max: 300 });
    if (!isStorageKey(key)) {
      throw new HttpError(400, 'INVALID_KEY', 'Invalid storage key.');
    }

    const prisma = getPrisma();
    const record = await prisma.fileObject.findUnique({ where: { key } });
    if (!record) throw new HttpError(404, 'NOT_FOUND', 'Unknown upload.');
    if (record.uploaderId !== user.id) {
      throw new HttpError(403, 'FORBIDDEN', 'This upload belongs to another account.');
    }

    const size = Math.round(Number(body.size));
    const updated =
      Number.isFinite(size) && size > 0
        ? await prisma.fileObject.update({ where: { key }, data: { size } })
        : record;

    res.json({ file: { key: updated.key, size: updated.size, contentType: updated.contentType } });
  })
);

filesRouter.post(
  '/files/signed-url',
  asyncHandler(async (req, res) => {
    const user = req.auth!.user;
    const body = requireObject(req.body);
    const key = requireString(body.key, 'key', { min: 1, max: 300 });
    if (!isStorageKey(key)) {
      throw new HttpError(400, 'INVALID_KEY', 'Invalid storage key.');
    }

    const record = await getPrisma().fileObject.findUnique({ where: { key } });
    if (!record) throw new HttpError(404, 'FILE_NOT_FOUND', 'Unknown or deleted file.');
    if (!canRead(user, record.uploaderId, record.scope)) {
      throw new HttpError(403, 'FORBIDDEN', 'You cannot open this file.');
    }

    const url = await getStorage().createDownloadUrl(key, DOWNLOAD_URL_TTL_SECONDS);
    res.json({ url, expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS });
  })
);

// Local storage driver: the browser uploads to the server, which writes to disk.
filesRouter.put(
  '/files/object',
  rawBody,
  asyncHandler(async (req, res) => {
    const storage = getStorage();
    if (!storage.writeObject) {
      throw new HttpError(404, 'NOT_FOUND', 'This storage driver uploads directly.');
    }

    const key = queryKey(req);
    const user = req.auth!.user;
    const record = await getPrisma().fileObject.findUnique({ where: { key } });
    if (!record) throw new HttpError(404, 'NOT_FOUND', 'Unknown upload.');
    if (record.uploaderId !== user.id) {
      throw new HttpError(403, 'FORBIDDEN', 'This upload belongs to another account.');
    }

    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (body.length === 0) {
      throw new HttpError(400, 'EMPTY_BODY', 'The uploaded file is empty.');
    }
    const limit = maxUploadBytes();
    if (body.length > limit) {
      throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'The uploaded file is too large.');
    }

    await storage.writeObject(key, body);
    await getPrisma().fileObject.update({ where: { key }, data: { size: body.length } });
    res.status(204).end();
  })
);

filesRouter.get(
  '/files/object',
  asyncHandler(async (req, res) => {
    const storage = getStorage();
    if (!storage.readObject) {
      throw new HttpError(404, 'NOT_FOUND', 'This storage driver serves signed URLs directly.');
    }

    const key = queryKey(req);
    const record = await getPrisma().fileObject.findUnique({ where: { key } });
    if (!record) throw new HttpError(404, 'FILE_NOT_FOUND', 'Unknown or deleted file.');
    if (!canRead(req.auth!.user, record.uploaderId, record.scope)) {
      throw new HttpError(403, 'FORBIDDEN', 'You cannot open this file.');
    }

    const body = await storage.readObject(key);
    if (!body) throw new HttpError(404, 'FILE_NOT_FOUND', 'The stored file is missing.');

    res.setHeader('Content-Type', record.contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    res.send(body);
  })
);
