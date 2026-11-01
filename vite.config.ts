import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import dotenv from 'dotenv';
import { aiService } from './server/aiService.ts';
import {
  MAX_BODY_BYTES,
  checkRateLimit,
  corsHeaders,
  isOriginAllowed,
  resolveDemoRole,
  validateChatBody,
  verifyCaller
} from './server/authGuard.ts';

dotenv.config({ override: true });

type BodyResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: 'too_large' | 'invalid_json' };

function sendJson(res: any, status: number, payload: unknown, headers: Record<string, string>): void {
  res.statusCode = status;
  for (const [name, value] of Object.entries(headers)) {
    res.setHeader(name, value);
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function readJsonBody(req: any): Promise<BodyResult> {
  return new Promise((resolve) => {
    let body = '';
    let size = 0;
    let settled = false;

    const finish = (result: BodyResult): void => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    req.on('data', (chunk: Buffer) => {
      if (settled) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        finish({ ok: false, reason: 'too_large' });
        req.resume();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      if (settled) return;
      try {
        finish({ ok: true, value: JSON.parse(body || '{}') });
      } catch {
        finish({ ok: false, reason: 'invalid_json' });
      }
    });
    req.on('error', () => finish({ ok: false, reason: 'invalid_json' }));
  });
}

async function handleChat(req: any, res: any, headers: Record<string, string>): Promise<void> {
  const parsed = await readJsonBody(req);
  if (!parsed.ok) {
    if (parsed.reason === 'too_large') {
      sendJson(res, 413, { error: 'PAYLOAD_TOO_LARGE', text: 'Request body is too large.' }, headers);
    } else {
      sendJson(res, 400, { error: 'INVALID_JSON', text: 'Request body must be valid JSON.' }, headers);
    }
    return;
  }

  try {
    const callerResult = await verifyCaller(req);
    if (!callerResult.ok) {
      sendJson(
        res,
        callerResult.status,
        {
          error: callerResult.status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN',
          text: callerResult.error
        },
        headers
      );
      return;
    }

    const rate = checkRateLimit(req, callerResult.caller);
    if (!rate.ok) {
      res.setHeader('Retry-After', String(rate.retryAfter));
      sendJson(
        res,
        429,
        {
          error: 'RATE_LIMITED',
          text: 'Too many assistant requests. Please wait a moment before trying again.'
        },
        headers
      );
      return;
    }

    const validated = validateChatBody(parsed.value);
    if (!validated.ok) {
      sendJson(res, 400, { error: 'BAD_REQUEST', text: validated.error }, headers);
      return;
    }

    const userRole =
      callerResult.caller.mode === 'supabase'
        ? callerResult.caller.role
        : resolveDemoRole((parsed.value as { userRole?: unknown }).userRole);

    const result = await aiService.generateResponse({
      message: validated.body.message,
      history: validated.body.history,
      userRole,
      currentPath: validated.body.currentPath
    });

    sendJson(res, 200, result, headers);
  } catch (err: any) {
    console.error('Vite AI Middleware error:', err);
    sendJson(
      res,
      500,
      { error: 'AI_BACKEND_ERROR', text: 'The AI backend could not process the request.' },
      headers
    );
  }
}

function aiAssistantBackendPlugin(): Plugin {
  return {
    name: 'ai-assistant-backend-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        dotenv.config({ override: true });

        if (req.url?.startsWith('/api/assistant/chat')) {
          const origin = req.headers.origin;
          const headers = corsHeaders(req);

          if (typeof origin === 'string' && origin.length > 0 && !isOriginAllowed(origin)) {
            sendJson(res, 403, { error: 'FORBIDDEN_ORIGIN', text: 'This origin is not allowed to call the assistant.' }, headers);
            return;
          }
          if (req.method === 'OPTIONS') {
            for (const [name, value] of Object.entries(headers)) {
              res.setHeader(name, value);
            }
            res.statusCode = 204;
            res.end();
            return;
          }
          if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED', text: 'Only POST is supported.' }, headers);
            return;
          }

          void handleChat(req, res, headers);
          return;
        }

        // Handle AI backend status endpoint
        if (req.url?.startsWith('/api/assistant/status') && req.method === 'GET') {
          const hasKey = Boolean(
            process.env.GEMINI_API_KEY &&
            process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' &&
            process.env.GEMINI_API_KEY.length > 5
          );
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({
            isConfigured: hasKey,
            provider: process.env.AI_PROVIDER || 'gemini',
            model: process.env.AI_MODEL || 'gemini-3-flash-preview'
          }));
          return;
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), aiAssistantBackendPlugin()],
  server: {
    port: 5173
  }
});
