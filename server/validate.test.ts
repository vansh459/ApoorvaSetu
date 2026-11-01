import { describe, expect, it } from 'vitest';
import { HttpError } from './http.ts';
import { optionalBoolean, optionalString, requireObject, requireString } from './validate.ts';

function expectHttpError(run: () => unknown, code: string): void {
  try {
    run();
    throw new Error('Expected the guard to throw.');
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).code).toBe(code);
    expect((error as HttpError).status).toBe(400);
  }
}

describe('request body guards', () => {
  it('accepts JSON objects only', () => {
    expect(requireObject({ email: 'a' })).toEqual({ email: 'a' });
    expectHttpError(() => requireObject([]), 'INVALID_BODY');
    expectHttpError(() => requireObject(null), 'INVALID_BODY');
  });

  it('trims required strings and enforces length', () => {
    expect(requireString('  Amit  ', 'name')).toBe('Amit');
    expectHttpError(() => requireString(42, 'name'), 'INVALID_BODY');
    expectHttpError(() => requireString('   ', 'name'), 'INVALID_BODY');
    expectHttpError(() => requireString('abcd', 'name', { max: 3 }), 'INVALID_BODY');
  });

  it('treats blank optional values as absent', () => {
    expect(optionalString('  ', 'phone')).toBeUndefined();
    expect(optionalString('999', 'phone')).toBe('999');
    expect(optionalBoolean('true')).toBeUndefined();
    expect(optionalBoolean(true)).toBe(true);
  });
});
