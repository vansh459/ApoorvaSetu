import { describe, expect, it } from 'vitest';
import { applyTransition, availableRevertStages, canTransition, nextStageFor } from './engine';
import type { Undertaking } from '../types';
import {
  adminActor,
  atStage,
  evcMemberActor,
  institutionActor,
  makeApplication,
  makeContext,
  otherRegionalOfficerActor,
  regionalOfficerActor
} from './__tests__/fixtures';

const verifiedUndertaking: Undertaking = {
  id: 'UND-1',
  applicationId: 'AICTE/2026/0001',
  instituteId: 'INST-101',
  instituteName: 'Test Institute of Technology',
  region: 'Northern',
  conditionCode: 'FACULTY_DEFICIT',
  title: 'Appoint faculty',
  dueDate: '2026-03-31',
  evidenceDocumentIds: [],
  status: 'Verified',
  escalationLevel: 0
};

describe('forwarding', () => {
  it('moves to the next route stage and stamps a fresh deadline', () => {
    const app = makeApplication({ stage: 'Scrutiny / Re-scrutiny' });
    const result = applyTransition(
      app,
      { action: 'FORWARD', actor: adminActor },
      makeContext()
    );

    expect(result.ok).toBe(true);
    expect(result.app?.stage).toBe('Expert Visit Committee (EVC)');
    expect(result.app?.version).toBe(2);
    expect(result.app?.stageEnteredAt).toBe('2026-01-20');
    expect(result.app?.stageDueAt).toBe('2026-02-10');
    expect(result.events[0]?.type).toBe('application.forwarded');
    expect(result.audit[0]?.correlationId).toBe(result.events[0]?.correlationId);
  });

  it('denies skipping stages', () => {
    const app = makeApplication({ stage: 'Scrutiny / Re-scrutiny' });
    const result = canTransition(
      app,
      { action: 'FORWARD', actor: adminActor, toStage: 'SAC / SHC' },
      makeContext()
    );

    expect(result.ok).toBe(false);
    expect(result.code).toBe('STAGE_SKIP');
  });

  it('denies reversing a stage with Forward', () => {
    const app = makeApplication({ stage: 'Scrutiny / Re-scrutiny' });
    const result = canTransition(
      app,
      { action: 'FORWARD', actor: adminActor, toStage: 'Submitted' },
      makeContext()
    );

    expect(result.code).toBe('STAGE_SKIP');
  });

  it('denies institutions and EVC members from moving a case', () => {
    const app = makeApplication();
    expect(canTransition(app, { action: 'FORWARD', actor: institutionActor }, makeContext()).code).toBe('FORBIDDEN');
    expect(canTransition(app, { action: 'FORWARD', actor: evcMemberActor }, makeContext()).code).toBe('FORBIDDEN');
  });

  it('denies a regional officer acting outside their region', () => {
    const app = makeApplication({ region: 'Northern' });
    const result = canTransition(
      app,
      { action: 'FORWARD', actor: otherRegionalOfficerActor },
      makeContext()
    );
    expect(result.code).toBe('FORBIDDEN');
  });

  it('denies forwarding from the final stage', () => {
    const app = atStage('Final Approval', { status: 'In Progress' });
    expect(canTransition(app, { action: 'FORWARD', actor: adminActor }, makeContext()).code).toBe('NO_NEXT_STAGE');
  });
});

describe('EVC gating', () => {
  it('blocks forwarding until the EVC report is submitted', () => {
    const app = atStage('Expert Visit Committee (EVC)');
    const result = canTransition(app, { action: 'FORWARD', actor: adminActor }, makeContext());
    expect(result.code).toBe('EVC_INCOMPLETE');
  });

  it('allows forwarding once the EVC report is submitted', () => {
    const app = atStage('Expert Visit Committee (EVC)');
    const result = canTransition(
      app,
      { action: 'FORWARD', actor: adminActor },
      makeContext({
        evcVisit: { id: 'EVC-1', status: 'Completed', reportSubmitted: true }
      })
    );
    expect(result.ok).toBe(true);
  });
});

describe('return and resubmission', () => {
  it('requires a reason code and a written note', () => {
    const app = makeApplication();
    expect(canTransition(app, { action: 'RETURN', actor: adminActor, note: 'Missing docs' }, makeContext()).code).toBe('REASON_REQUIRED');
    expect(canTransition(app, { action: 'RETURN', actor: adminActor, reasonCode: 'DOC_MISSING' }, makeContext()).code).toBe('REASON_REQUIRED');
  });

  it('records a deficiency, pauses the SLA and blocks forwarding', () => {
    const app = makeApplication();
    const result = applyTransition(
      app,
      { action: 'RETURN', actor: adminActor, reasonCode: 'DOC_MISSING', note: 'Land deed missing.' },
      makeContext()
    );

    expect(result.ok).toBe(true);
    expect(result.app?.status).toBe('Returned');
    expect(result.app?.slaTier).toBe('Paused');
    expect(result.app?.deficiencies?.[0]?.code).toBe('DOC_MISSING');
    expect(result.app?.returns?.[0]?.fromStage).toBe('Scrutiny / Re-scrutiny');

    const forward = canTransition(result.app!, { action: 'FORWARD', actor: adminActor }, makeContext());
    expect(forward.code).toBe('OPEN_DEFICIENCIES');
  });

  it('resumes the stage clock when the institution resubmits', () => {
    const returned = applyTransition(
      makeApplication(),
      { action: 'RETURN', actor: adminActor, reasonCode: 'DOC_MISSING', note: 'Land deed missing.' },
      makeContext()
    ).app!;

    const resubmitted = applyTransition(
      returned,
      { action: 'RESUBMIT', actor: institutionActor, note: 'Land deed uploaded.' },
      makeContext({ now: new Date(2026, 0, 25) })
    );

    expect(resubmitted.ok).toBe(true);
    expect(resubmitted.app?.status).toBe('In Progress');
    expect(resubmitted.app?.stage).toBe('Scrutiny / Re-scrutiny');
    expect(resubmitted.app?.stageDueAt).toBe('2026-02-24');
    expect(resubmitted.app?.deficiencies?.every((item) => item.resolvedAt)).toBe(true);
    expect(resubmitted.app?.returns?.[0]?.resubmittedAt).toBe('2026-01-25');

    const forward = canTransition(resubmitted.app!, { action: 'FORWARD', actor: adminActor }, makeContext());
    expect(forward.ok).toBe(true);
  });

  it('only lets the institution resubmit a returned case', () => {
    const returned = applyTransition(
      makeApplication(),
      { action: 'RETURN', actor: adminActor, reasonCode: 'DOC_MISSING', note: 'Land deed missing.' },
      makeContext()
    ).app!;

    expect(canTransition(returned, { action: 'RESUBMIT', actor: adminActor }, makeContext()).code).toBe('FORBIDDEN');
    expect(canTransition(makeApplication(), { action: 'RESUBMIT', actor: institutionActor }, makeContext()).code).toBe('NOT_RETURNED');
  });
});

describe('revert', () => {
  it('requires an earlier target and a recorded reason', () => {
    const app = atStage('SAC / SHC');
    expect(
      canTransition(app, { action: 'REVERT', actor: adminActor, toStage: 'Final Approval', reasonCode: 'EVC_ADVERSE', note: 'x' }, makeContext()).code
    ).toBe('INVALID_STAGE');
    expect(
      canTransition(app, { action: 'REVERT', actor: adminActor, toStage: 'Scrutiny / Re-scrutiny' }, makeContext()).code
    ).toBe('REASON_REQUIRED');
  });

  it('moves backward and restores a deadline for the target stage', () => {
    const app = atStage('SAC / SHC', {
      routeId: 'ROUTE_EVC_SAC',
      type: 'New Technical Campus'
    });
    const result = applyTransition(
      app,
      { action: 'REVERT', actor: adminActor, toStage: 'Scrutiny / Re-scrutiny', reasonCode: 'DOC_EXPIRED', note: 'Land certificate expired.' },
      makeContext()
    );

    expect(result.ok).toBe(true);
    expect(result.app?.stage).toBe('Scrutiny / Re-scrutiny');
    expect(result.app?.stageDueAt).toBe('2026-02-19');
    expect(result.events[0]?.type).toBe('application.reverted');
    expect(availableRevertStages(app)).toEqual([
      'Submitted',
      'Scrutiny / Re-scrutiny',
      'Expert Visit Committee (EVC)'
    ]);
  });
});

describe('authority decisions', () => {
  it('blocks approval outside the final stage', () => {
    const app = makeApplication({ stage: 'Scrutiny / Re-scrutiny' });
    const result = canTransition(
      app,
      { action: 'APPROVE', actor: adminActor, competentAuthority: 'AICTE Admin' },
      makeContext()
    );
    expect(result.code).toBe('NOT_AUTHORITY_STAGE');
  });

  it('blocks regional officers from approving', () => {
    const app = atStage('Final Approval', { status: 'In Progress' });
    const result = canTransition(
      app,
      { action: 'APPROVE', actor: regionalOfficerActor, competentAuthority: 'RO' },
      makeContext({ undertakings: [verifiedUndertaking] })
    );
    expect(result.code).toBe('FORBIDDEN');
  });

  it('blocks final approval while undertakings are pending', () => {
    const app = atStage('Final Approval', { status: 'In Progress' });
    const result = canTransition(
      app,
      { action: 'APPROVE', actor: adminActor },
      makeContext({
        undertakings: [{ ...verifiedUndertaking, status: 'Pending' }]
      })
    );
    expect(result.code).toBe('UNDERTAKING_PENDING');
  });

  it('records the competent authority on approval', () => {
    const app = atStage('Final Approval', { status: 'In Progress' });
    const result = applyTransition(
      app,
      {
        action: 'APPROVE',
        actor: adminActor,
        competentAuthority: 'Member Secretary, AICTE',
        note: 'All conditions satisfied.'
      },
      makeContext({ undertakings: [verifiedUndertaking] })
    );

    expect(result.ok).toBe(true);
    expect(result.app?.status).toBe('Approved');
    expect(result.app?.decision?.outcome).toBe('Approved');
    expect(result.app?.decision?.competentAuthority).toBe('Member Secretary, AICTE');
    expect(result.events[0]?.type).toBe('application.approved');
  });

  it('requires a statutory reason to reject', () => {
    const app = makeApplication();
    expect(canTransition(app, { action: 'REJECT', actor: adminActor, note: 'No reason' }, makeContext()).code).toBe('REASON_REQUIRED');
  });

  it('records rejection with before and after state in the audit', () => {
    const app = makeApplication();
    const result = applyTransition(
      app,
      { action: 'REJECT', actor: adminActor, reasonCode: 'INELIGIBLE_INSTITUTE', note: 'Does not meet land norms.' },
      makeContext()
    );

    expect(result.ok).toBe(true);
    expect(result.app?.status).toBe('Rejected');
    expect(result.audit[0]?.previousState).toContain('"stage":"Scrutiny / Re-scrutiny"');
    expect(result.audit[0]?.newState).toContain('"status":"Rejected"');
  });

  it('rejects stale versions', () => {
    const app = makeApplication({ version: 4 });
    const result = canTransition(
      app,
      { action: 'FORWARD', actor: adminActor, expectedVersion: 3 },
      makeContext()
    );
    expect(result.code).toBe('VERSION_CONFLICT');
  });
});

describe('helpers', () => {
  it('resolves the next stage per route', () => {
    expect(nextStageFor(makeApplication())).toBe('Expert Visit Committee (EVC)');
    expect(nextStageFor(atStage('Final Approval', { status: 'In Progress' }))).toBeNull();
  });
});
