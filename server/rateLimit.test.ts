import { afterEach, describe, expect, it } from 'vitest';
import type { Request } from 'express';
import {
  checkLoginRate,
  clientIp,
  clearLoginRate,
  loginRateKey,
  recordLoginFailure,
  resetLoginRateLimit
} from './rateLimit.ts';

function fakeRequest(headers: Record<string, string> = {}): Request {
  return { headers, socket: {} } as unknown as Request;
}

afterEach(() => resetLoginRateLimit());

describe('login rate limiting', () => {
  it('keys attempts by client address and email', () => {
    const req = fakeRequest({ 'x-forwarded-for': '10.0.0.1, 10.0.0.2' });
    expect(clientIp(req)).toBe('10.0.0.1');
    expect(loginRateKey(req, 'AICTE@example.com')).toBe('10.0.0.1:aicte@example.com');
    expect(clientIp(fakeRequest())).toBe('local');
  });

  it('blocks the ninth attempt inside the window', () => {
    const key = 'ip:test@example.com';
    for (let attempt = 0; attempt < 8; attempt += 1) {
      expect(checkLoginRate(key).allowed).toBe(true);
      recordLoginFailure(key);
    }
    const blocked = checkLoginRate(key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('clears a bucket after a successful sign-in', () => {
    const key = 'ip:test@example.com';
    for (let attempt = 0; attempt < 8; attempt += 1) recordLoginFailure(key);
    expect(checkLoginRate(key).allowed).toBe(false);

    clearLoginRate(key);
    expect(checkLoginRate(key).allowed).toBe(true);
  });
});
