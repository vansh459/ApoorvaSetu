// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import type { AuditLog } from '../../types';
import {
  AUDIT_STORAGE_KEY,
  LEGACY_STORAGE_PREFIX,
  LOCAL_KEYS,
  clearLocal,
  localRepository,
  readLocal,
  writeLocal
} from './localRepository';

const auditEntry = (index: number): Omit<AuditLog, 'id'> => ({
  timestamp: new Date(2026, 0, 1, 10, index).toISOString(),
  userId: 'USR-ADMIN',
  userName: 'AICTE Admin',
  userRole: 'AICTE_ADMIN',
  action: 'TEST_ACTION',
  entityType: 'Application',
  entityId: `AICTE/2026/${index}`,
  details: 'Synthetic audit row',
  ipAddress: '127.0.0.1'
});

describe('local repository storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('round-trips values under the v4 keys', () => {
    writeLocal('applications', [{ id: 'AICTE/2026/0001' }]);
    expect(window.localStorage.getItem(LOCAL_KEYS.applications)).toContain('AICTE/2026/0001');
    expect(readLocal('applications', [])).toEqual([{ id: 'AICTE/2026/0001' }]);
  });

  it('migrates legacy v3 data on first read', () => {
    window.localStorage.setItem(
      `${LEGACY_STORAGE_PREFIX}_apps`,
      JSON.stringify([{ id: 'AICTE/2025/12876' }])
    );

    const migrated = readLocal<{ id: string }[]>('applications', []);
    expect(migrated[0]?.id).toBe('AICTE/2025/12876');
    expect(window.localStorage.getItem(LOCAL_KEYS.applications)).toContain('AICTE/2025/12876');
  });

  it('falls back when stored JSON is corrupt', () => {
    window.localStorage.setItem(LOCAL_KEYS.applications, '{not-json');
    expect(readLocal('applications', [{ id: 'fallback' }])).toEqual([{ id: 'fallback' }]);
  });

  it('appends audit rows newest-first and caps the log', async () => {
    const existing: AuditLog[] = Array.from({ length: 2000 }, (_, index) => ({
      ...auditEntry(index),
      id: `AUD-EXISTING-${index}`
    }));
    window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(existing));

    await localRepository.appendAudit(auditEntry(2000));

    const stored = JSON.parse(window.localStorage.getItem(AUDIT_STORAGE_KEY) || '[]') as AuditLog[];
    expect(stored).toHaveLength(2000);
    expect(stored[0]?.entityId).toBe('AICTE/2026/2000');
    expect(stored[0]?.id).toMatch(/^AUD-/);
    expect(stored.some((row) => row.id === 'AUD-EXISTING-1999')).toBe(false);
  });

  it('clears both current and legacy keys on reset', () => {
    writeLocal('applications', []);
    window.localStorage.setItem(`${LEGACY_STORAGE_PREFIX}_apps`, '[]');
    clearLocal();
    expect(window.localStorage.getItem(LOCAL_KEYS.applications)).toBeNull();
    expect(window.localStorage.getItem(`${LEGACY_STORAGE_PREFIX}_apps`)).toBeNull();
  });

  it('reports demo mode with no-op remote writes', async () => {
    expect(localRepository.isRemote).toBe(false);
    expect(localRepository.mode).toBe('demo');
    expect(await localRepository.loadRemote()).toBeNull();
    expect(await localRepository.upsertApplication({ id: 'x' } as never)).toBe(true);
    expect(localRepository.subscribe('applications', () => undefined)).toBeTypeOf('function');
  });
});
