import { describe, expect, it } from 'vitest';
import {
  MAX_BODY_BYTES,
  createRateLimiter,
  exceedsByteLimit,
  originAllowed,
  resolveDemoRole,
  validateChatBody
} from './aiGuard';

describe('validateChatBody', () => {
  it('accepts a message and normalises it', () => {
    const result = validateChatBody({ message: '  Where is my application?  ' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body.message).toBe('Where is my application?');
      expect(result.body.history).toEqual([]);
      expect(result.body.currentPath).toBeUndefined();
    }
  });

  it('keeps a bounded, well-formed history', () => {
    const result = validateChatBody({
      message: 'Next step?',
      currentPath: '/applications',
      history: [
        { role: 'user', content: 'Hello' },
        { role: 'model', content: 'Hello, how can I help?' }
      ]
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body.history).toHaveLength(2);
      expect(result.body.currentPath).toBe('/applications');
    }
  });

  it('rejects missing, empty and non-string messages', () => {
    for (const input of [{}, { message: '' }, { message: '   ' }, { message: 42 }, null, 'text']) {
      expect(validateChatBody(input).ok).toBe(false);
    }
  });

  it('rejects an over-long message', () => {
    expect(validateChatBody({ message: 'a'.repeat(2001) }).ok).toBe(false);
    expect(validateChatBody({ message: 'a'.repeat(2000) }).ok).toBe(true);
  });

  it('rejects malformed history', () => {
    expect(validateChatBody({ message: 'Hi', history: 'nope' }).ok).toBe(false);
    expect(validateChatBody({ message: 'Hi', history: [{ role: 'system', content: 'x' }] }).ok).toBe(false);
    expect(validateChatBody({ message: 'Hi', history: [{ role: 'user', content: 7 }] }).ok).toBe(false);
    expect(
      validateChatBody({ message: 'Hi', history: Array.from({ length: 21 }, () => ({ role: 'user', content: 'x' })) }).ok
    ).toBe(false);
  });

  it('drops an oversized currentPath instead of failing', () => {
    const result = validateChatBody({ message: 'Hi', currentPath: '/'.padEnd(201, 'a') });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.body.currentPath).toBeUndefined();
  });
});

describe('exceedsByteLimit', () => {
  it('reads numeric and string headers', () => {
    expect(exceedsByteLimit(undefined)).toBe(false);
    expect(exceedsByteLimit('not-a-number')).toBe(false);
    expect(exceedsByteLimit(MAX_BODY_BYTES)).toBe(false);
    expect(exceedsByteLimit(String(MAX_BODY_BYTES))).toBe(false);
    expect(exceedsByteLimit(MAX_BODY_BYTES + 1)).toBe(true);
  });
});

describe('createRateLimiter', () => {
  it('allows the configured budget and then blocks with a retry hint', () => {
    let now = 0;
    const limit = createRateLimiter({ windowMs: 60_000, max: 3, now: () => now });
    expect(limit('user-1').ok).toBe(true);
    expect(limit('user-1').ok).toBe(true);
    expect(limit('user-1').ok).toBe(true);

    const blocked = limit('user-1');
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfter).toBe(60);

    now = 60_000;
    expect(limit('user-1').ok).toBe(true);
  });

  it('tracks callers independently', () => {
    const limit = createRateLimiter({ windowMs: 60_000, max: 1, now: () => 0 });
    expect(limit('user-1').ok).toBe(true);
    expect(limit('user-1').ok).toBe(false);
    expect(limit('user-2').ok).toBe(true);
  });
});

describe('originAllowed', () => {
  it('allows same-origin and server-to-server calls', () => {
    expect(originAllowed('', [])).toBe(true);
  });

  it('uses the configured allowlist when present', () => {
    const allowed = ['https://aicte.gov.in'];
    expect(originAllowed('https://aicte.gov.in', allowed)).toBe(true);
    expect(originAllowed('https://evil.example', allowed)).toBe(false);
    expect(originAllowed('http://localhost:5173', allowed)).toBe(false);
  });

  it('falls back to local development origins only', () => {
    expect(originAllowed('http://localhost:5173', [])).toBe(true);
    expect(originAllowed('http://127.0.0.1:3001', [])).toBe(true);
    expect(originAllowed('http://[::1]:5173', [])).toBe(true);
    expect(originAllowed('https://evil.example', [])).toBe(false);
  });
});

describe('resolveDemoRole', () => {
  it('accepts only known roles', () => {
    expect(resolveDemoRole('INSTITUTION_ADMIN')).toBe('INSTITUTION_ADMIN');
    expect(resolveDemoRole('SUPER_ADMIN')).toBe('SUPER_ADMIN');
  });

  it('falls back to guest for unknown or malformed values', () => {
    expect(resolveDemoRole('super_admin')).toBe('GUEST');
    expect(resolveDemoRole(' SUPER_ADMIN')).toBe('GUEST');
    expect(resolveDemoRole(undefined)).toBe('GUEST');
    expect(resolveDemoRole(['SUPER_ADMIN'])).toBe('GUEST');
  });
});
