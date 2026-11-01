export interface ChatHistoryMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ChatBody {
  message: string;
  history: ChatHistoryMessage[];
  currentPath?: string;
}

export const MAX_BODY_BYTES = 64 * 1024;
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX = 20;

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_ITEMS = 20;
const MAX_HISTORY_LENGTH = 4000;

const DEMO_ROLES = new Set([
  'SUPER_ADMIN',
  'AICTE_ADMIN',
  'REGIONAL_OFFICER',
  'EVC_MEMBER',
  'INSTITUTION_ADMIN'
]);

export function exceedsByteLimit(contentLength: unknown): boolean {
  const length = typeof contentLength === 'number' ? contentLength : Number(contentLength);
  return Number.isFinite(length) && length > MAX_BODY_BYTES;
}

export function validateChatBody(
  input: unknown
): { ok: true; body: ChatBody } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }
  const candidate = input as Record<string, unknown>;
  const message = candidate.message;

  if (typeof message !== 'string' || !message.trim()) {
    return { ok: false, error: 'Message is required.' };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: 'Message is too long.' };
  }

  const history: ChatHistoryMessage[] = [];
  if (candidate.history !== undefined) {
    if (!Array.isArray(candidate.history) || candidate.history.length > MAX_HISTORY_ITEMS) {
      return { ok: false, error: 'History must be a short list of messages.' };
    }
    for (const item of candidate.history) {
      if (!item || typeof item !== 'object') {
        return { ok: false, error: 'History entries must be objects.' };
      }
      const entry = item as Record<string, unknown>;
      if (entry.role !== 'user' && entry.role !== 'model') {
        return { ok: false, error: 'History roles must be user or model.' };
      }
      if (typeof entry.content !== 'string' || entry.content.length > MAX_HISTORY_LENGTH) {
        return { ok: false, error: 'History content is invalid.' };
      }
      history.push({ role: entry.role, content: entry.content });
    }
  }

  const currentPath =
    typeof candidate.currentPath === 'string' && candidate.currentPath.length <= 200
      ? candidate.currentPath
      : undefined;

  return { ok: true, body: { message: message.trim(), history, currentPath } };
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

export function createRateLimiter(options: {
  windowMs?: number;
  max?: number;
  now?: () => number;
} = {}): (key: string) => RateLimitResult {
  const windowMs = options.windowMs ?? RATE_LIMIT_WINDOW_MS;
  const max = options.max ?? RATE_LIMIT_MAX;
  const now = options.now ?? Date.now;
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return (key: string): RateLimitResult => {
    const current = now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= current) {
      if (buckets.size > 5000) {
        for (const [bucketKey, value] of buckets) {
          if (value.resetAt <= current) buckets.delete(bucketKey);
        }
      }
      buckets.set(key, { count: 1, resetAt: current + windowMs });
      return { ok: true };
    }

    if (bucket.count >= max) {
      return {
        ok: false,
        retryAfter: Math.max(1, Math.ceil((bucket.resetAt - current) / 1000))
      };
    }

    bucket.count += 1;
    return { ok: true };
  };
}

export function originAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (allowedOrigins.length > 0) return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/.test(origin);
}

/**
 * Demo mode has no identity provider, so the assistant accepts a role only from
 * the closed role set. Production derives the role from the authenticated profile.
 */
export function resolveDemoRole(value: unknown): string {
  return typeof value === 'string' && DEMO_ROLES.has(value) ? value : 'GUEST';
}
