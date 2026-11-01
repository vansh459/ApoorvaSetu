import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { aiService } from './aiService.ts';
import {
  MAX_BODY_BYTES,
  bodyTooLarge,
  checkRateLimit,
  isOriginAllowed,
  resolveDemoRole,
  validateChatBody,
  verifyCaller
} from './authGuard.ts';
import { errorHandler, HttpError } from './http.ts';
import { getPrisma, isDatabaseConfigured } from './db.ts';
import { handleEvents } from './events.ts';
import { requireSession } from './session.ts';
import { getStorage } from './storage/index.ts';
import { authRouter } from './routes/auth.ts';
import { adminRouter } from './routes/admin.ts';
import { dataRouter } from './routes/data.ts';
import { workflowRouter } from './routes/workflow.ts';
import { filesRouter } from './routes/files.ts';
import { assistantRouter } from './routes/assistant.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.disable('x-powered-by');
app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || isOriginAllowed(origin));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true
  })
);
app.use(express.json({ limit: `${Math.floor(MAX_BODY_BYTES / 1024)}kb` }));

function rejectedOrigin(origin: unknown): boolean {
  return typeof origin === 'string' && origin.length > 0 && !isOriginAllowed(origin);
}

// State-changing requests must come from an allowed origin; reads and same-origin requests pass.
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }
  if (rejectedOrigin(req.headers.origin)) {
    res.status(403).json({
      error: 'ORIGIN_NOT_ALLOWED',
      text: 'This origin is not allowed to change data.'
    });
    return;
  }
  next();
});

// Health Check
app.get('/api/health', async (_req, res) => {
  let database: 'unconfigured' | 'connected' | 'error' = 'unconfigured';
  if (isDatabaseConfigured()) {
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      database = 'connected';
    } catch {
      database = 'error';
    }
  }

  let storage: string = 'unconfigured';
  try {
    storage = getStorage().driver;
  } catch {
    storage = 'unconfigured';
  }

  res.json({
    status: 'ok',
    service: 'ApoorvaSetu AI Assistant Backend',
    database,
    storage,
    timestamp: new Date().toISOString()
  });
});

// Readiness: only green once the database answers, so compose waits for migrations.
app.get('/api/ready', async (_req, res) => {
  if (!isDatabaseConfigured()) {
    res.status(503).json({ ready: false, database: 'unconfigured' });
    return;
  }
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    res.json({ ready: true, database: 'connected' });
  } catch {
    res.status(503).json({ ready: false, database: 'error' });
  }
});

app.use('/api/auth', authRouter);

// Assistant Status Check (Config verification)
app.get('/api/assistant/status', (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
  res.json({
    isConfigured: hasKey,
    provider: process.env.AI_PROVIDER || 'gemini',
    model: process.env.AI_MODEL || 'gemini-3-flash-preview'
  });
});

// Main AI Chat Endpoint
app.post('/api/assistant/chat', async (req, res) => {
  try {
    if (rejectedOrigin(req.headers.origin)) {
      res.status(403).json({ error: 'FORBIDDEN_ORIGIN', text: 'This origin is not allowed to call the assistant.' });
      return;
    }

    if (bodyTooLarge(req)) {
      res.status(413).json({ error: 'PAYLOAD_TOO_LARGE', text: 'Request body is too large.' });
      return;
    }

    const callerResult = await verifyCaller(req);
    if (!callerResult.ok) {
      res.status(callerResult.status).json({
        error: callerResult.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN',
        text: callerResult.error
      });
      return;
    }

    const rate = checkRateLimit(req, callerResult.caller);
    if (!rate.ok) {
      res.setHeader('Retry-After', String(rate.retryAfter));
      res.status(429).json({
        error: 'RATE_LIMITED',
        text: 'Too many assistant requests. Please wait a moment before trying again.'
      });
      return;
    }

    const validated = validateChatBody(req.body);
    if (!validated.ok) {
      res.status(400).json({ error: 'BAD_REQUEST', text: validated.error });
      return;
    }

    const userRole =
      callerResult.caller.mode !== 'demo'
        ? callerResult.caller.role
        : resolveDemoRole((req.body as { userRole?: unknown } | undefined)?.userRole);

    const result = await aiService.generateResponse({
      message: validated.body.message,
      history: validated.body.history,
      userRole,
      currentPath: validated.body.currentPath
    });

    res.json(result);
  } catch (error: any) {
    console.error('Server error handling /api/assistant/chat:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      text: 'An internal server error occurred while processing the request.'
    });
  }
});

// Live data feed for the browser repository (SSE).
app.get('/api/events', requireSession, (req, res) => {
  handleEvents(req, res);
});

// Authenticated data and administration APIs. Mounted after the assistant routes so
// the session guard only applies to these endpoints.
app.use('/api', adminRouter);
app.use('/api', workflowRouter);
app.use('/api', filesRouter);
app.use('/api', assistantRouter);
app.use('/api', dataRouter);

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, '..', 'dist');
const indexHtml = path.join(distDir, 'index.html');
const FILE_REQUEST = /\.(?:js|mjs|css|map|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|otf|json|txt|webmanifest|pdf)$/i;

// Unknown /api/* must be JSON, never the SPA shell.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', text: 'Unknown API endpoint.' });
});

if (existsSync(indexHtml)) {
  app.use(
    express.static(distDir, {
      index: false,
      etag: true,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    })
  );

  // Express 5 / path-to-regexp v8: app.get('*') is invalid. Pathless middleware is safe.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path === '/api' || req.path.startsWith('/api/')) return next();
    if (FILE_REQUEST.test(req.path)) {
      res.status(404).type('text/plain').send('Not found');
      return;
    }
    res.sendFile(indexHtml, (error) => {
      if (error) next(error);
    });
  });

  console.log(`[ApoorvaSetu AI Backend] Serving SPA from ${distDir}`);
} else {
  console.log('[ApoorvaSetu AI Backend] dist/ not found - serving API only.');
}

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!(error instanceof HttpError) && error?.code === 'P2002') {
    res.status(409).json({ error: 'ALREADY_EXISTS', text: 'That record already exists.' });
    return;
  }
  if (!(error instanceof HttpError) && error?.code === 'P2025') {
    res.status(404).json({ error: 'NOT_FOUND', text: 'The record was not found.' });
    return;
  }
  if (!(error instanceof HttpError) && (error?.type === 'entity.too.large' || error?.status === 413)) {
    res.status(413).json({ error: 'PAYLOAD_TOO_LARGE', text: 'Request body is too large.' });
    return;
  }
  if (!(error instanceof HttpError) && (error?.type === 'entity.parse.failed' || error?.status === 400)) {
    res.status(400).json({ error: 'INVALID_JSON', text: 'Request body must be valid JSON.' });
    return;
  }
  errorHandler(error, req, res, next);
});

app.listen(PORT, () => {
  console.log(`[ApoorvaSetu AI Backend] Running on http://localhost:${PORT}`);
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
  if (hasKey) {
    console.log(`[ApoorvaSetu AI Backend] Google Gemini API Key configured. Model: ${process.env.AI_MODEL || 'gemini-3-flash-preview'}`);
  } else {
    console.warn(`[ApoorvaSetu AI Backend] WARNING: GEMINI_API_KEY is not set in .env! Configure it to enable live AI responses.`);
  }
});
