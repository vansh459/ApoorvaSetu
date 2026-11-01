import { describe, expect, it } from 'vitest';
import { notificationsForEvent } from './notifications';
import type { DomainEvent, DomainEventType } from './types';
import { makeApplication } from './__tests__/fixtures';

function event(type: DomainEventType, payload: Record<string, unknown> = {}): DomainEvent {
  return {
    id: 'EVT-1',
    type,
    entityType: 'Application',
    entityId: 'AICTE/2026/0001',
    at: '2026-01-20T10:00:00.000Z',
    actorName: 'AICTE Admin',
    payload
  };
}

describe('notificationsForEvent', () => {
  const app = makeApplication();

  it('routes a submission to the owning institution only', () => {
    const drafts = notificationsForEvent(event('application.submitted'), app);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      targetRole: 'INSTITUTION_ADMIN',
      targetInstituteId: 'INST-101',
      priority: 'low',
      link: '/institution/tracking'
    });
  });

  it('notifies the regional office and the institution when a case advances', () => {
    const drafts = notificationsForEvent(
      event('application.forwarded', { toStage: 'Expert Visit Committee (EVC)' }),
      app
    );
    expect(drafts).toHaveLength(2);
    expect(drafts.map((draft) => draft.targetRole)).toEqual(['REGIONAL_OFFICER', 'INSTITUTION_ADMIN']);
    expect(drafts[0].targetRegion).toBe('Northern');
    expect(drafts[0].title).toContain('Expert Visit Committee (EVC)');
    expect(drafts[1].targetInstituteId).toBe('INST-101');
  });

  it('marks a return for correction as high priority with the reason code', () => {
    const [draft] = notificationsForEvent(
      event('application.returned', { reasonCode: 'DOC_MISSING', note: 'Upload the fire safety certificate.' }),
      app
    );
    expect(draft.priority).toBe('high');
    expect(draft.description).toContain('DOC_MISSING');
    expect(draft.description).toContain('fire safety certificate');
  });

  it('targets a decision at the institution and records the competent authority', () => {
    const [draft] = notificationsForEvent(
      event('application.approved', { competentAuthority: 'Chairman, AICTE' }),
      app
    );
    expect(draft.priority).toBe('high');
    expect(draft.description).toContain('Chairman, AICTE');
    expect(draft.targetInstituteId).toBe('INST-101');
  });

  it('keeps EVC reminders with the committee and the institution', () => {
    const drafts = notificationsForEvent(event('evc.scheduled', { committee: 'EVC-2' }), app);
    expect(drafts.map((draft) => draft.targetRole)).toEqual(['EVC_MEMBER', 'INSTITUTION_ADMIN']);
    expect(drafts[0].priority).toBe('high');
    expect(drafts[0].link).toBe('/evc-scheduling');
  });

  it('gives every notification a stable, event-scoped dedupe key', () => {
    const drafts = notificationsForEvent(event('application.forwarded'), app);
    const keys = drafts.map((draft) => draft.dedupeKey);
    expect(new Set(keys).size).toBe(drafts.length);
    expect(keys[0]).toBe('application.forwarded:AICTE/2026/0001:EVT-1:REGIONAL_OFFICER:all');
    expect(drafts.map((draft) => draft.eventType)).toEqual(['application.forwarded', 'application.forwarded']);
  });

  it('survives a missing application record', () => {
    const [draft] = notificationsForEvent(event('application.submitted'), null);
    expect(draft.targetInstituteId).toBeUndefined();
    expect(draft.targetRole).toBe('INSTITUTION_ADMIN');
    expect(draft.title).toContain('AICTE/2026/0001');
  });

  it('escalates overdue EVC reports to the central administration', () => {
    const [draft] = notificationsForEvent(event('evc.report_overdue'), app);
    expect(draft.targetRole).toBe('AICTE_ADMIN');
    expect(draft.priority).toBe('high');
  });

  it('sends overdue undertakings to the institution with the case scope', () => {
    const [draft] = notificationsForEvent(event('undertaking.overdue'), app);
    expect(draft.targetRole).toBe('INSTITUTION_ADMIN');
    expect(draft.targetInstituteId).toBe('INST-101');
    expect(draft.priority).toBe('high');
  });
});
