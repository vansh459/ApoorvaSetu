import { aiService } from '../../server/aiService.ts';
import {
  bodyTooLarge,
  checkRateLimit,
  corsHeaders,
  isOriginAllowed,
  resolveDemoRole,
  validateChatBody,
  verifyCaller
} from '../../server/authGuard.ts';

export default async function handler(req: any, res: any) {
  const headers = corsHeaders(req);
  for (const [name, value] of Object.entries(headers)) {
    res.setHeader(name, value);
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED', text: 'Only POST is supported.' });
    return;
  }

  const origin = req.headers?.origin;
  if (typeof origin === 'string' && origin.length > 0 && !isOriginAllowed(origin)) {
    res.status(403).json({ error: 'FORBIDDEN_ORIGIN', text: 'This origin is not allowed to call the assistant.' });
    return;
  }

  if (bodyTooLarge(req)) {
    res.status(413).json({ error: 'PAYLOAD_TOO_LARGE', text: 'Request body is too large.' });
    return;
  }

  try {
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
      callerResult.caller.mode === 'supabase'
        ? callerResult.caller.role
        : resolveDemoRole((req.body as { userRole?: unknown } | undefined)?.userRole);

    const result = await aiService.generateResponse({
      message: validated.body.message,
      history: validated.body.history,
      userRole,
      currentPath: validated.body.currentPath
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Vercel serverless API error:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      text: 'An error occurred while contacting the AI service.'
    });
  }
}
