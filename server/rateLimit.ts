import type { Request } from 'express';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : '';
  return first || req.socket.remoteAddress || 'local';
}

export function loginRateKey(req: Request, email: string): string {
  return `${clientIp(req)}:${email.toLowerCase()}`;
}

export function checkLoginRate(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (bucket.count < MAX_ATTEMPTS) {
    return { allowed: true, retryAfterSeconds: 0 };
  }
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  };
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  bucket.count += 1;
}

export function clearLoginRate(key: string): void {
  buckets.delete(key);
}

export function resetLoginRateLimit(): void {
  buckets.clear();
}
