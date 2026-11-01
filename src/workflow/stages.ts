import type { ApplicationStage, UserRole } from '../types';

export interface StageMeta {
  id: ApplicationStage;
  order: number;
  label: string;
  shortLabel: string;
  description: string;
  responsible: string;
  slaDays: number;
  ownerRole: UserRole;
  color: string;
  active: boolean;
  legacyAliasOf?: ApplicationStage;
}

export const STAGE_META: Record<ApplicationStage, StageMeta> = {
  'Submitted': {
    id: 'Submitted',
    order: 1,
    label: 'Submitted',
    shortLabel: 'Submitted',
    description: 'Online filing, fee reconciliation and auto-acknowledgement.',
    responsible: 'Central Portal Automation',
    slaDays: 2,
    ownerRole: 'INSTITUTION_ADMIN',
    color: 'var(--color-chart-6)',
    active: true
  },
  'Scrutiny / Re-scrutiny': {
    id: 'Scrutiny / Re-scrutiny',
    order: 2,
    label: 'Scrutiny / Re-scrutiny',
    shortLabel: 'Scrutiny',
    description: 'Deficiency examination by the Regional Scrutiny Committee.',
    responsible: 'Regional Scrutiny Committee',
    slaDays: 30,
    ownerRole: 'REGIONAL_OFFICER',
    color: 'var(--color-chart-1)',
    active: true
  },
  'Expert Visit Committee (EVC)': {
    id: 'Expert Visit Committee (EVC)',
    order: 3,
    label: 'Expert Visit Committee (EVC)',
    shortLabel: 'EVC',
    description: 'On-site or hybrid inspection of labs, land and faculty.',
    responsible: 'Constituted Expert Visit Committee',
    slaDays: 21,
    ownerRole: 'EVC_MEMBER',
    color: 'var(--color-chart-4)',
    active: true
  },
  'SAC / SHC': {
    id: 'SAC / SHC',
    order: 4,
    label: 'SAC / SHC',
    shortLabel: 'SAC / SHC',
    description: 'Standing Appellate Committee review and hearing.',
    responsible: 'Appellate Hearing Bench',
    slaDays: 21,
    ownerRole: 'AICTE_ADMIN',
    color: 'var(--color-chart-2)',
    active: true
  },
  'Compliance / Undertaking Verification': {
    id: 'Compliance / Undertaking Verification',
    order: 5,
    label: 'Compliance / Undertaking Verification',
    shortLabel: 'Compliance',
    description: 'Verification of time-bound undertakings and supporting evidence.',
    responsible: 'Regional Compliance Cell',
    slaDays: 15,
    ownerRole: 'AICTE_ADMIN',
    color: 'var(--color-chart-1)',
    active: true
  },
  'Approval (Subject to Undertaking)': {
    id: 'Approval (Subject to Undertaking)',
    order: 6,
    label: 'Approval (Subject to Undertaking)',
    shortLabel: 'Approval',
    description: 'Conditional approval pending notarised compliance undertakings.',
    responsible: 'Approval Bureau / Regional Officer',
    slaDays: 15,
    ownerRole: 'AICTE_ADMIN',
    color: 'var(--color-chart-3)',
    active: true
  },
  'Final Approval': {
    id: 'Final Approval',
    order: 7,
    label: 'Final Approval',
    shortLabel: 'Final',
    description: 'Council ratification and digitally sealed Letter of Approval.',
    responsible: 'Member Secretary & Council',
    slaDays: 10,
    ownerRole: 'SUPER_ADMIN',
    color: 'var(--color-chart-2)',
    active: true
  },
  'Initial Scrutiny': {
    id: 'Initial Scrutiny',
    order: 2,
    label: 'Initial Scrutiny',
    shortLabel: 'Scrutiny',
    description: 'Legacy alias for regional scrutiny.',
    responsible: 'Regional Scrutiny Committee',
    slaDays: 30,
    ownerRole: 'REGIONAL_OFFICER',
    color: 'var(--color-chart-1)',
    active: false,
    legacyAliasOf: 'Scrutiny / Re-scrutiny'
  },
  'Regional Review': {
    id: 'Regional Review',
    order: 2,
    label: 'Regional Review',
    shortLabel: 'Review',
    description: 'Legacy alias for regional scrutiny.',
    responsible: 'Regional Office',
    slaDays: 30,
    ownerRole: 'REGIONAL_OFFICER',
    color: 'var(--color-chart-1)',
    active: false,
    legacyAliasOf: 'Scrutiny / Re-scrutiny'
  },
  'Final AICTE Review': {
    id: 'Final AICTE Review',
    order: 6,
    label: 'Final AICTE Review',
    shortLabel: 'Final Review',
    description: 'Legacy alias for the approval bureau review.',
    responsible: 'Approval Bureau',
    slaDays: 10,
    ownerRole: 'AICTE_ADMIN',
    color: 'var(--color-chart-3)',
    active: false,
    legacyAliasOf: 'Approval (Subject to Undertaking)'
  },
  'Other Stages': {
    id: 'Other Stages',
    order: 99,
    label: 'Other Stages',
    shortLabel: 'Other',
    description: 'Catch-all bucket for legacy records.',
    responsible: 'Bureau',
    slaDays: 15,
    ownerRole: 'AICTE_ADMIN',
    color: 'var(--color-chart-6)',
    active: false,
    legacyAliasOf: 'Scrutiny / Re-scrutiny'
  }
};

export const OPERATIONAL_STAGES: ApplicationStage[] = Object.values(STAGE_META)
  .filter((meta) => meta.active)
  .sort((a, b) => a.order - b.order)
  .map((meta) => meta.id);

export function canonicalStage(stage: ApplicationStage): ApplicationStage {
  const meta = STAGE_META[stage];
  return meta?.legacyAliasOf ?? stage;
}

export function getStageMeta(stage: ApplicationStage): StageMeta {
  return STAGE_META[canonicalStage(stage)];
}

export function stageOrder(stage: ApplicationStage): number {
  return getStageMeta(stage).order;
}

export function stageLabel(stage: ApplicationStage): string {
  return getStageMeta(stage).label;
}

export function isOperationalStage(stage: ApplicationStage): boolean {
  return STAGE_META[stage]?.active === true;
}

export function summaryStages(): ApplicationStage[] {
  return OPERATIONAL_STAGES;
}
