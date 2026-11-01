import { describe, expect, it } from 'vitest';
import { filterAlertsForUser } from './rbacService';
import type { SystemAlert, User } from '../types';

function user(overrides: Partial<User> = {}): User {
  return {
    id: 'USR-1',
    name: 'Test Officer',
    email: 'officer@aicte-india.org',
    role: 'REGIONAL_OFFICER',
    roleTitle: 'Regional Officer',
    permissions: [],
    initials: 'TO',
    isActive: true,
    createdAt: '2026-01-01',
    ...overrides
  };
}

function alert(overrides: Partial<SystemAlert> = {}): SystemAlert {
  return {
    id: 'ALT-1',
    rule: 'application.stage',
    entityType: 'Application',
    entityId: 'AICTE/2026/0001',
    tier: 'Breached',
    severity: 'high',
    dedupeKey: 'application.stage:AICTE/2026/0001:Breached',
    createdAt: '2026-02-20T10:00:00.000Z',
    status: 'Open',
    title: 'Stage SLA breached',
    description: 'Scrutiny exceeded its target.',
    link: '/applications',
    ...overrides
  };
}

describe('filterAlertsForUser', () => {
  it('returns nothing for a missing or inactive user', () => {
    const alerts = [alert()];
    expect(filterAlertsForUser(alerts, null)).toEqual([]);
    expect(filterAlertsForUser(alerts, user({ isActive: false }))).toEqual([]);
  });

  it('gives super administrators every alert', () => {
    const alerts = [alert(), alert({ id: 'ALT-2', region: 'Southern' })];
    expect(filterAlertsForUser(alerts, user({ role: 'SUPER_ADMIN' }))).toHaveLength(2);
  });

  it('scopes regional and EVC alerts to their own region plus region-less alerts', () => {
    const alerts = [
      alert({ id: 'OWN', region: 'Northern' }),
      alert({ id: 'OTHER', region: 'Southern' }),
      alert({ id: 'NATIONWIDE' })
    ];

    expect(
      filterAlertsForUser(alerts, user({ region: 'Northern' })).map((item) => item.id)
    ).toEqual(['OWN', 'NATIONWIDE']);
    expect(
      filterAlertsForUser(alerts, user({ role: 'EVC_MEMBER', region: 'Northern' })).map(
        (item) => item.id
      )
    ).toEqual(['OWN', 'NATIONWIDE']);
  });

  it('scopes institution admins to their own institute plus unassigned alerts', () => {
    const alerts = [
      alert({ id: 'OWN', entityType: 'Document', instituteId: 'INST-101' }),
      alert({ id: 'OTHER', entityType: 'Document', instituteId: 'INST-202' }),
      alert({ id: 'GENERAL' })
    ];

    expect(
      filterAlertsForUser(alerts, user({ role: 'INSTITUTION_ADMIN', instituteId: 'INST-101' })).map(
        (item) => item.id
      )
    ).toEqual(['OWN', 'GENERAL']);
  });

  it('honours target roles for central administrators', () => {
    const alerts = [
      alert({ id: 'FOR_ADMIN', targetRoles: ['AICTE_ADMIN'] }),
      alert({ id: 'FOR_OFFICER', targetRoles: ['REGIONAL_OFFICER'] })
    ];

    expect(
      filterAlertsForUser(alerts, user({ role: 'AICTE_ADMIN' })).map((item) => item.id)
    ).toEqual(['FOR_ADMIN']);
  });
});
