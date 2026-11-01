import { describe, expect, it } from 'vitest';
import { TEMPLATE_KINDS, communicationTemplate } from './templates';
import { DEFAULT_WORKFLOW_CONFIG } from './config';
import { makeApplication } from './__tests__/fixtures';

const now = new Date(2026, 2, 1);

function render(overrides: Parameters<typeof makeApplication>[0] = {}) {
  return makeApplication({
    stage: 'Scrutiny / Re-scrutiny',
    stageEnteredAt: '2026-01-01',
    stageDueAt: '2026-01-20',
    deficiencies: [
      {
        code: 'DOC_MISSING',
        note: 'Lease deed notarisation missing',
        stage: 'Scrutiny / Re-scrutiny',
        raisedAt: '2026-01-10',
        raisedBy: 'Regional Officer'
      }
    ],
    assignedOfficerId: 'OFF-11',
    ...overrides
  });
}

const options = { officer: 'Regional Officer', config: DEFAULT_WORKFLOW_CONFIG, now };

describe('communication templates', () => {
  it('covers the four standard notice kinds', () => {
    expect(TEMPLATE_KINDS).toEqual(['return', 'reminder', 'escalation', 'approval']);
  });

  it('lists open deficiencies in a return notice', () => {
    const notice = communicationTemplate('return', render(), options);
    expect(notice.subject).toContain('Deficiency notice');
    expect(notice.body).toContain('DOC_MISSING: Lease deed notarisation missing');
    expect(notice.body).toContain('Resubmit through the portal');
    expect(notice.body).toContain('Issued by: Regional Officer');
  });

  it('states the due date and overdue position in a reminder', () => {
    const reminder = communicationTemplate('reminder', render(), options);
    expect(reminder.subject).toContain('Scrutiny / Re-scrutiny');
    expect(reminder.body).toContain('40 day(s) overdue');
    expect(reminder.body).toContain('Days in this stage: 59');
  });

  it('escalates without claiming an automated decision', () => {
    const escalation = communicationTemplate('escalation', render(), options);
    expect(escalation.body).toContain('service level by 40 day(s)');
    expect(escalation.body).toContain('OFF-11');
    expect(escalation.body).toContain('No decision has been taken automatically');
  });

  it('requires a recorded human decision before issuing approval news', () => {
    const pending = communicationTemplate('approval', render(), options);
    expect(pending.body).toContain('must be recorded by the competent authority');
    expect(pending.body).toContain('the workflow itself does not approve or reject');

    const recorded = communicationTemplate(
      'approval',
      render({
        decision: {
          outcome: 'Approved',
          code: 'APPROVED',
          note: 'All conditions satisfied',
          by: 'USR-MS',
          at: '2026-02-25',
          competentAuthority: 'Member Secretary, AICTE'
        }
      }),
      options
    );
    expect(recorded.body).toContain('Outcome: Approved');
    expect(recorded.body).toContain('Competent authority: Member Secretary, AICTE');
    expect(recorded.body).toContain('authorised human officer');
  });
});
