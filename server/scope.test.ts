import { describe, expect, it } from 'vitest';
import type { User } from '../src/types/index.ts';
import { HttpError } from './http.ts';
import {
  assertPresentScope,
  assertScope,
  assertUnchanged,
  canAccessRegion,
  stripFields
} from './scope.ts';

function user(overrides: Partial<User>): User {
  return {
    id: 'USR-TEST',
    name: 'Test Officer',
    email: 'test@aicte.gov.in',
    role: 'REGIONAL_OFFICER',
    roleTitle: 'Regional Officer',
    permissions: [],
    initials: 'TO',
    isActive: true,
    createdAt: '2026-01-01',
    ...overrides
  } as User;
}

function expectScopeDenial(run: () => void): void {
  try {
    run();
    throw new Error('Expected the scope guard to reject the write.');
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(403);
    expect((error as HttpError).code).toBe('SCOPE_DENIED');
  }
}

describe('jurisdiction guards', () => {
  const regional = user({ role: 'REGIONAL_OFFICER', region: 'Northern' });
  const institution = user({ role: 'INSTITUTION_ADMIN', instituteId: 'INST-1' });
  const admin = user({ role: 'AICTE_ADMIN' });

  it('lets central administrators write anywhere', () => {
    expect(() => assertScope(admin, { region: 'Southern', instituteId: 'INST-9' })).not.toThrow();
  });

  it('confines regional officers to their region', () => {
    expect(() => assertScope(regional, { region: 'Northern' })).not.toThrow();
    expectScopeDenial(() => assertScope(regional, { region: 'Southern' }));
    expect(canAccessRegion(regional, 'northern')).toBe(true);
  });

  it('confines institution admins to their institute', () => {
    expect(() => assertScope(institution, { instituteId: 'INST-1' })).not.toThrow();
    expectScopeDenial(() => assertScope(institution, { instituteId: 'INST-2' }));
  });

  it('only checks present jurisdiction for broadcast records', () => {
    expect(() => assertPresentScope(regional, {})).not.toThrow();
    expect(() => assertPresentScope(regional, { region: 'Northern' })).not.toThrow();
    expectScopeDenial(() => assertPresentScope(regional, { region: 'Eastern' }));
  });
});

describe('regulated field guards', () => {
  it('allows unchanged protected fields and rejects edits', () => {
    const current = { stage: 'Regional Review', status: 'In Progress', version: 2 };
    expect(() =>
      assertUnchanged({ stage: 'Regional Review', status: 'In Progress' }, current, ['stage', 'status'])
    ).not.toThrow();

    try {
      assertUnchanged({ stage: 'Final Approval' }, current, ['stage', 'status']);
      throw new Error('Expected the field guard to reject the change.');
    } catch (error) {
      expect((error as HttpError).code).toBe('REGULATED_FIELD');
    }
  });

  it('removes fields before they reach persistence', () => {
    const body = { id: 'A-1', verifiedBy: 'Forged', status: 'Pending' };
    const cleaned = stripFields(body, ['verifiedBy']);
    expect(cleaned).toEqual({ id: 'A-1', status: 'Pending' });
    expect(body.verifiedBy).toBe('Forged');
  });
});
