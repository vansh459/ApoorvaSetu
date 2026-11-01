import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import type {
  Application as ApplicationRow,
  ComplianceRecord as ComplianceRow,
  DocumentItem as DocumentRow,
  EVCVisit as EVCVisitRow,
  EscalationItem as EscalationRow,
  Institute as InstituteRow,
  NotificationItem as NotificationRow,
  SystemAlert as AlertRow,
  SystemConfig as SystemConfigRow,
  Undertaking as UndertakingRow,
  User as UserRow
} from '@prisma/client';
import type {
  AuditLog,
  EscalationItem,
  SystemAlert,
  User
} from '../../src/types/index.ts';
import {
  initialApplications,
  initialComplianceRecords,
  initialDocuments,
  initialEVCVisits,
  initialInstitutes,
  initialNotifications,
  initialUndertakings
} from '../../src/data/initialData.ts';
import { INITIAL_AUDIT_LOGS, INITIAL_CONFIG, INITIAL_USERS } from '../../src/data/demoUsers.ts';
import { hashPassword, verifyPassword } from '../password.ts';
import { asArray, asObject, asOptionalArray, optional } from './json.ts';
import {
  toApplication,
  toApplicationData,
  toComplianceRecord,
  toComplianceRecordData,
  toDocumentItem,
  toDocumentItemData,
  toEVCVisit,
  toEVCVisitData,
  toInstitute,
  toInstituteData,
  toUndertaking,
  toUndertakingData
} from './entities.ts';
import {
  toAuditLog,
  toAuditLogData,
  toEscalation,
  toEscalationData,
  toNotification,
  toNotificationData,
  toSystemAlert,
  toSystemAlertData
} from './operations.ts';
import {
  toSystemConfig,
  toSystemConfigData,
  toUser,
  toUserData
} from './admin.ts';

// Prisma create inputs use DbNull sentinels; a real DB row exposes SQL NULL instead.
function stored<T>(input: unknown): T {
  if (input === Prisma.DbNull || input === Prisma.JsonNull) return null as T;
  if (Array.isArray(input)) return input.map((item) => stored(item)) as T;
  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, stored(value)])
    ) as T;
  }
  return input as T;
}

describe('json helpers', () => {
  it('normalises arrays and objects', () => {
    expect(asArray<number>([1, 2])).toEqual([1, 2]);
    expect(asArray<number>(null)).toEqual([]);
    expect(asOptionalArray<string>(undefined)).toBeUndefined();
    expect(asOptionalArray<string>(['a'])).toEqual(['a']);
    expect(asObject<{ a: number }>({ a: 1 })).toEqual({ a: 1 });
    expect(asObject<{ a: number }>(['a'])).toBeUndefined();
  });

  it('maps null to undefined', () => {
    expect(optional(null)).toBeUndefined();
    expect(optional(undefined)).toBeUndefined();
    expect(optional(0)).toBe(0);
    expect(optional('')).toBe('');
  });
});

describe('entity mappers round-trip', () => {
  it('application', () => {
    const domain = { ...initialApplications[0], version: initialApplications[0].version ?? 1 };
    const row = stored<ApplicationRow>(toApplicationData(domain));
    expect(toApplication(row)).toEqual(domain);
  });

  it('institute', () => {
    const domain = initialInstitutes[0];
    const row = stored<InstituteRow>(toInstituteData(domain));
    expect(toInstitute(row)).toEqual(domain);
  });

  it('EVC visit', () => {
    const domain = initialEVCVisits[0];
    const row = stored<EVCVisitRow>(toEVCVisitData(domain));
    expect(toEVCVisit(row)).toEqual(domain);
  });

  it('compliance record', () => {
    const domain = initialComplianceRecords[0];
    const row = stored<ComplianceRow>(toComplianceRecordData(domain));
    expect(toComplianceRecord(row)).toEqual(domain);
  });

  it('document item', () => {
    const domain = initialDocuments[0];
    const row = stored<DocumentRow>(toDocumentItemData(domain));
    expect(toDocumentItem(row)).toEqual(domain);
  });

  it('undertaking', () => {
    const domain = initialUndertakings[0];
    const row = stored<UndertakingRow>(toUndertakingData(domain));
    expect(toUndertaking(row)).toEqual(domain);
  });

  it('notification', () => {
    const domain = initialNotifications[0];
    const row = stored<NotificationRow>(toNotificationData(domain));
    expect(toNotification(row)).toEqual(domain);
  });

  it('audit log', () => {
    const domain = INITIAL_AUDIT_LOGS[0];
    const row = stored<Parameters<typeof toAuditLog>[0]>(toAuditLogData(domain));
    expect(toAuditLog(row)).toEqual(domain);
  });
});

describe('operations mappers round-trip', () => {
  const alert: SystemAlert = {
    id: 'ALT-TEST-1',
    rule: 'sla-breach',
    entityType: 'Application',
    entityId: 'APP2026-0012',
    tier: 'Breached',
    severity: 'high',
    dedupeKey: 'sla:APP2026-0012:1',
    createdAt: '2026-10-30',
    status: 'Open',
    title: 'Stage breached',
    description: 'Stage SLA exceeded.',
    region: 'Northern'
  };

  const escalation: EscalationItem = {
    id: 'ESC-TEST-1',
    applicationId: 'APP2026-0012',
    instituteName: 'ABC Institute of Tech',
    region: 'Northern',
    raisedBy: 'System',
    raisedDate: '2026-10-30',
    urgency: 'High',
    reason: 'SLA breach',
    status: 'Open',
    dedupeKey: 'escalation:APP2026-0012:1',
    entityType: 'Application',
    entityId: 'APP2026-0012'
  };

  it('system alert', () => {
    const row = stored<AlertRow>(toSystemAlertData(alert));
    expect(toSystemAlert(row)).toEqual(alert);
  });

  it('escalation', () => {
    const row = stored<EscalationRow>(toEscalationData(escalation));
    expect(toEscalation(row)).toEqual(escalation);
  });

  it('audit log preserves string snapshots', () => {
    const domain: AuditLog = INITIAL_AUDIT_LOGS[0];
    const row = stored<Parameters<typeof toAuditLog>[0]>(toAuditLogData(domain));
    const mapped = toAuditLog(row);
    expect(mapped.previousState).toBe(domain.previousState);
    expect(mapped.newState).toBe(domain.newState);
  });
});

describe('admin mappers', () => {
  it('system config round-trips including workflow overrides', () => {
    const domain = {
      ...INITIAL_CONFIG,
      stageSlas: { Submitted: { days: 5, approachingPct: 75 } },
      documentWarningDays: [45, 15],
      businessDaysOnly: true
    };
    const row = stored<SystemConfigRow>(toSystemConfigData(domain));
    expect(toSystemConfig(row)).toEqual(domain);
  });

  it('system config maps empty overrides to undefined', () => {
    const row = stored<SystemConfigRow>(toSystemConfigData(INITIAL_CONFIG));
    expect(toSystemConfig(row)).toEqual(INITIAL_CONFIG);
  });

  it('user omits the password hash from the domain object', () => {
    const domain: User = { ...INITIAL_USERS[0] };
    const row = stored<UserRow>(toUserData(domain, 'scrypt$salt$digest'));
    expect(row.passwordHash).toBe('scrypt$salt$digest');
    expect(toUser(row)).toEqual(domain);
  });
});

describe('password hashing', () => {
  it('hashes and verifies a password', async () => {
    const hash = hashPassword('Apoorva@2026');
    expect(hash.startsWith('scrypt$')).toBe(true);
    await expect(verifyPassword('Apoorva@2026', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('rejects malformed or missing hashes', async () => {
    await expect(verifyPassword('x', null)).resolves.toBe(false);
    await expect(verifyPassword('x', 'plain-text')).resolves.toBe(false);
    await expect(verifyPassword('x', 'scrypt$only-salt')).resolves.toBe(false);
  });
});
