import type { Application, ApplicationStage } from '../../types';
import { normalizeApplication } from '../engine';
import { DEFAULT_WORKFLOW_CONFIG } from '../config';
import type { ActorRef, WorkflowContext } from '../types';

export const adminActor: ActorRef = {
  id: 'USR-ADMIN',
  name: 'AICTE Admin',
  role: 'AICTE_ADMIN'
};

export const superAdminActor: ActorRef = {
  id: 'USR-SUPER',
  name: 'Super Admin',
  role: 'SUPER_ADMIN'
};

export const regionalOfficerActor: ActorRef = {
  id: 'USR-RO',
  name: 'Regional Officer',
  role: 'REGIONAL_OFFICER',
  region: 'Northern'
};

export const otherRegionalOfficerActor: ActorRef = {
  id: 'USR-RO-2',
  name: 'Other Regional Officer',
  role: 'REGIONAL_OFFICER',
  region: 'Southern'
};

export const institutionActor: ActorRef = {
  id: 'USR-INST',
  name: 'Institution Admin',
  role: 'INSTITUTION_ADMIN',
  instituteId: 'INST-101'
};

export const evcMemberActor: ActorRef = {
  id: 'USR-EVC',
  name: 'EVC Member',
  role: 'EVC_MEMBER'
};

export function makeContext(overrides: Partial<WorkflowContext> = {}): WorkflowContext {
  return {
    config: DEFAULT_WORKFLOW_CONFIG,
    now: new Date(2026, 0, 20),
    ...overrides
  };
}

export function makeApplication(overrides: Partial<Application> = {}): Application {
  const base: Application = {
    id: 'AICTE/2026/0001',
    instituteId: 'INST-101',
    instituteName: 'Test Institute of Technology',
    type: 'Extension of Approval (EoA)',
    routeId: 'ROUTE_SCRUTINY_EVC',
    region: 'Northern',
    state: 'Delhi',
    stage: 'Scrutiny / Re-scrutiny',
    status: 'In Progress',
    lastUpdated: '01 Jan 2026',
    appliedDate: '01 Jan 2026',
    category: 'Engineering & Technology',
    intakeProposed: 300,
    programs: ['Computer Engineering'],
    contactEmail: 'principal@test.edu',
    contactPhone: '+91 90000 00000',
    documents: [],
    timeline: [],
    stageEnteredAt: '2026-01-01',
    stageDueAt: '2026-01-31',
    version: 1
  };

  return normalizeApplication({ ...base, ...overrides }, new Date(2026, 0, 20));
}

export function atStage(stage: ApplicationStage, overrides: Partial<Application> = {}): Application {
  return makeApplication({
    stage,
    timeline: [],
    ...overrides
  });
}
