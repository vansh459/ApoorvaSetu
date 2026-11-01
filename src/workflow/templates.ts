import type { Application } from '../types';
import type { WorkflowConfig } from './types';
import { DEFAULT_WORKFLOW_CONFIG } from './config';
import { applicationAgeDays } from './selectors';
import { applicationOverdueWindow } from './sla';
import { formatDisplayDate, getNow } from '../utils/dates';

export type TemplateKind = 'return' | 'reminder' | 'escalation' | 'approval';

export interface CommunicationTemplate {
  kind: TemplateKind;
  title: string;
  subject: string;
  body: string;
}

export interface TemplateOptions {
  officer: string;
  config?: WorkflowConfig;
  now?: Date;
}

const TEMPLATE_TITLES: Record<TemplateKind, string> = {
  return: 'Return notice',
  reminder: 'Stage reminder',
  escalation: 'Escalation note',
  approval: 'Approval communication'
};

export function communicationTemplate(
  kind: TemplateKind,
  app: Application,
  options: TemplateOptions
): CommunicationTemplate {
  const config = options.config ?? DEFAULT_WORKFLOW_CONFIG;
  const now = options.now ?? getNow();
  const sla = applicationOverdueWindow(app, config, now);
  const age = applicationAgeDays(app, now);
  const openDeficiencies = (app.deficiencies ?? []).filter((item) => !item.resolvedAt);

  const signature = `\n\nIssued by: ${options.officer}\nDate: ${formatDisplayDate(now)}`;
  const intro = `Application ${app.id} — ${app.instituteName} (${app.region} Region)`;
  const stageLine = `Current stage: ${app.stage}. Days in this stage: ${age}.`;

  switch (kind) {
    case 'return':
      return {
        kind,
        title: TEMPLATE_TITLES[kind],
        subject: `Deficiency notice for ${app.id}`,
        body:
          `${intro}\n\n` +
          `The case is returned for correction. The following deficiencies must be resolved before resubmission:\n` +
          `${openDeficiencies.length ? openDeficiencies.map((item) => `- ${item.code}: ${item.note}`).join('\n') : '- Deficiencies are recorded in the case file.'}\n\n` +
          `${stageLine}\n` +
          `Resubmit through the portal once the corrections and supporting evidence are attached.` +
          signature
      };
    case 'reminder':
      return {
        kind,
        title: TEMPLATE_TITLES[kind],
        subject: `Reminder: ${app.stage} for ${app.id}`,
        body:
          `${intro}\n\n` +
          `This is a reminder that the case is awaiting action at ${app.stage}. ` +
          `The stage due date is ${sla.dueAt ? formatDisplayDate(sla.dueAt) : 'not recorded'}, ` +
          `with ${sla.daysRemaining >= 0 ? `${sla.daysRemaining} day(s) remaining` : `${sla.daysOverdue} day(s) overdue`}.\n` +
          `${stageLine}` +
          signature
      };
    case 'escalation':
      return {
        kind,
        title: TEMPLATE_TITLES[kind],
        subject: `Escalation: ${app.id} is ${sla.daysOverdue} day(s) overdue`,
        body:
          `${intro}\n\n` +
          `The case has crossed its ${app.stage} service level by ${sla.daysOverdue} day(s).\n` +
          `${stageLine}\n` +
          `Accountable officer or committee: ${app.assignedOfficerId ?? app.lastActionBy ?? 'current stage owner'}.\n` +
          `Please review the file and record the next action. No decision has been taken automatically.` +
          signature
      };
    case 'approval': {
      const decision = app.decision;
      return {
        kind,
        title: TEMPLATE_TITLES[kind],
        subject: `Decision recorded for ${app.id}`,
        body:
          `${intro}\n\n` +
          (decision
            ? `Outcome: ${decision.outcome}.\nReason: ${decision.note}\nCompetent authority: ${decision.competentAuthority}.\nRecorded on: ${formatDisplayDate(decision.at)}.\n`
            : `The case has reached ${app.stage}. The decision must be recorded by the competent authority before this communication is issued.\n`) +
          `This communication confirms a decision recorded by an authorised human officer; the workflow itself does not approve or reject any case.` +
          signature
      };
    }
  }
}

export const TEMPLATE_KINDS: TemplateKind[] = ['return', 'reminder', 'escalation', 'approval'];
