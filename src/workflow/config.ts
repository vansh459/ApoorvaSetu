import type {
  ApplicationStage,
  EscalationRule,
  NotificationRule,
  StageSla,
  SystemConfig
} from '../types';
import { OPERATIONAL_STAGES, STAGE_META } from './stages';
import type { WorkflowConfig } from './types';

export const DEFAULT_STAGE_SLAS: Record<ApplicationStage, StageSla> = Object.fromEntries(
  (Object.keys(STAGE_META) as ApplicationStage[]).map((stage) => [
    stage,
    { days: STAGE_META[stage].slaDays, approachingPct: 80 }
  ])
) as Record<ApplicationStage, StageSla>;

export const DEFAULT_ESCALATION_MATRIX: EscalationRule[] = [
  { level: 1, breachDays: 3, targetRoles: ['REGIONAL_OFFICER'] },
  { level: 2, breachDays: 7, targetRoles: ['AICTE_ADMIN', 'REGIONAL_OFFICER'] },
  { level: 3, breachDays: 14, targetRoles: ['SUPER_ADMIN', 'AICTE_ADMIN'] }
];

export const NOTIFICATION_EVENT_TYPES = [
  'application.submitted',
  'application.forwarded',
  'application.returned',
  'application.resubmitted',
  'application.approved',
  'application.rejected',
  'application.deadline_approaching',
  'application.deadline_breached',
  'evc.scheduled',
  'evc.rescheduled',
  'evc.cancelled',
  'evc.completed',
  'evc.report_overdue',
  'undertaking.created',
  'undertaking.submitted',
  'undertaking.verified',
  'undertaking.overdue',
  'document.uploaded',
  'document.verified',
  'document.rejected',
  'document.expiring',
  'document.expired',
  'document.renewal_requested',
  'document.renewal_submitted',
  'document.renewal_verified',
  'document.renewal_rejected',
  'escalation.raised'
];

export const DEFAULT_NOTIFICATION_RULES: NotificationRule[] = NOTIFICATION_EVENT_TYPES.map((eventType) => ({
  eventType,
  enabled: true,
  channels: ['inapp'],
  notifyRoles: []
}));

export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  stageSlas: DEFAULT_STAGE_SLAS,
  escalationMatrix: DEFAULT_ESCALATION_MATRIX,
  notificationRules: DEFAULT_NOTIFICATION_RULES,
  documentWarningDays: [60, 30, 7],
  undertakingWarningDays: [30, 15, 7],
  businessDaysOnly: false,
  evcReportSlaDays: 7,
  evcSchedulingSlaDays: 21
};

export function resolveWorkflowConfig(systemConfig?: Partial<SystemConfig> | null): WorkflowConfig {
  if (!systemConfig) return DEFAULT_WORKFLOW_CONFIG;

  const stageSlas = { ...DEFAULT_STAGE_SLAS };
  if (systemConfig.stageSlas) {
    (Object.keys(systemConfig.stageSlas) as ApplicationStage[]).forEach((stage) => {
      const override = systemConfig.stageSlas?.[stage];
      if (override) stageSlas[stage] = { ...stageSlas[stage], ...override };
    });
  }

  return {
    stageSlas,
    escalationMatrix: systemConfig.escalationMatrix?.length
      ? systemConfig.escalationMatrix
      : DEFAULT_ESCALATION_MATRIX,
    notificationRules: systemConfig.notificationRules?.length
      ? systemConfig.notificationRules
      : DEFAULT_NOTIFICATION_RULES,
    documentWarningDays: systemConfig.documentWarningDays?.length
      ? systemConfig.documentWarningDays
      : DEFAULT_WORKFLOW_CONFIG.documentWarningDays,
    undertakingWarningDays: systemConfig.undertakingWarningDays?.length
      ? systemConfig.undertakingWarningDays
      : DEFAULT_WORKFLOW_CONFIG.undertakingWarningDays,
    businessDaysOnly: systemConfig.businessDaysOnly ?? false,
    evcReportSlaDays: DEFAULT_WORKFLOW_CONFIG.evcReportSlaDays,
    evcSchedulingSlaDays: DEFAULT_WORKFLOW_CONFIG.evcSchedulingSlaDays
  };
}

export function operationalStageSlas(config: WorkflowConfig): { stage: ApplicationStage; sla: StageSla }[] {
  return OPERATIONAL_STAGES.map((stage) => ({ stage, sla: config.stageSlas[stage] }));
}
