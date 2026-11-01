import { describe, expect, it } from 'vitest';
import type { Request } from 'express';
import {
  createSessionToken,
  hashToken,
  parseCookies,
  readCookie,
  sessionExpiry,
  sessionTtlMs
} from './session.ts';

function fakeRequest(cookie?: string): Request {
  return { headers: cookie ? { cookie } : {} } as unknown as Request;
}

describe('session tokens', () => {
  it('creates opaque tokens that are never stored verbatim', () => {
    const token = createSessionToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(hashToken(token)).not.toBe(token);
    expect(hashToken(token)).toHaveLength(64);
  });

  it('generates a different token each time', () => {
    expect(createSessionToken()).not.toBe(createSessionToken());
  });

  it('hashes with SHA-256', () => {
    expect(hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });
});

describe('session expiry', () => {
  const now = new Date('2026-11-01T00:00:00.000Z');

  it('defaults to a 12 hour session', () => {
    expect(sessionTtlMs(false)).toBe(12 * 60 * 60 * 1000);
    expect(sessionExpiry(false, now).toISOString()).toBe('2026-11-01T12:00:00.000Z');
  });

  it('extends to 30 days when remembered', () => {
    expect(sessionTtlMs(true)).toBe(30 * 24 * 60 * 60 * 1000);
    expect(sessionExpiry(true, now).toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });
});

describe('cookie parsing', () => {
  it('parses multiple cookies and decodes values', () => {
    expect(parseCookies('a=1; apoorvasetu_sid=a%2Fb%3D; c=')).toEqual({
      a: '1',
      apoorvasetu_sid: 'a/b=',
      c: ''
    });
  });

  it('ignores malformed segments', () => {
    expect(parseCookies('lonely; x=1')).toEqual({ x: '1' });
  });

  it('returns undefined when the cookie is absent', () => {
    expect(readCookie(fakeRequest(), 'apoorvasetu_sid')).toBeUndefined();
    expect(readCookie(fakeRequest('apoorvasetu_sid=token'), 'apoorvasetu_sid')).toBe('token');
  });
});
