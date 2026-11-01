import type { Application, ApplicationStage, RouteId, WorkflowRoute } from '../types';
import { canonicalStage, isOperationalStage, STAGE_META } from './stages';

export const WORKFLOW_ROUTES: WorkflowRoute[] = [
  {
    id: 'ROUTE_SCRUTINY_ONLY',
    label: 'Only Scrutiny',
    applicationTypes: [
      'Increase in Intake',
      'Increase in Approved Intake',
      'New Course Introduction',
      'Introduction of New Courses / Emerging Areas',
      'Addition of Integrated Course'
    ],
    stages: [
      'Submitted',
      'Scrutiny / Re-scrutiny',
      'Approval (Subject to Undertaking)',
      'Final Approval'
    ],
    requiresEVC: false,
    requiresUndertaking: true,
    requiresSAC: false
  },
  {
    id: 'ROUTE_SCRUTINY_EVC',
    label: 'Scrutiny + EVC',
    applicationTypes: ['Extension of Approval (EoA)', 'Extension of Approval'],
    stages: [
      'Submitted',
      'Scrutiny / Re-scrutiny',
      'Expert Visit Committee (EVC)',
      'Approval (Subject to Undertaking)',
      'Final Approval'
    ],
    requiresEVC: true,
    requiresUndertaking: true,
    requiresSAC: false
  },
  {
    id: 'ROUTE_EVC_SAC',
    label: 'Scrutiny + EVC + SAC/SHC',
    applicationTypes: ['New Technical Campus', 'New Institution', 'New Technical Institution'],
    stages: [
      'Submitted',
      'Scrutiny / Re-scrutiny',
      'Expert Visit Committee (EVC)',
      'SAC / SHC',
      'Approval (Subject to Undertaking)',
      'Final Approval'
    ],
    requiresEVC: true,
    requiresUndertaking: true,
    requiresSAC: true
  },
  {
    id: 'ROUTE_EVC_ONLY',
    label: 'Only EVC',
    applicationTypes: ['Closure of Non-viable Programs', 'Closure of Institution', 'Closure'],
    stages: [
      'Submitted',
      'Expert Visit Committee (EVC)',
      'Approval (Subject to Undertaking)',
      'Final Approval'
    ],
    requiresEVC: true,
    requiresUndertaking: true,
    requiresSAC: false
  },
  {
    id: 'ROUTE_SCRUTINY_SAC',
    label: 'Scrutiny + SAC/SHC',
    applicationTypes: ['Reduction in Intake', 'Program Closure'],
    stages: [
      'Submitted',
      'Scrutiny / Re-scrutiny',
      'SAC / SHC',
      'Approval (Subject to Undertaking)',
      'Final Approval'
    ],
    requiresEVC: false,
    requiresUndertaking: true,
    requiresSAC: true
  },
  {
    id: 'ROUTE_SAC_APPEAL',
    label: 'SAC/SHC Appeal',
    applicationTypes: ['Appeal', 'Appeal against Rejection', 'Review Petition'],
    stages: ['Submitted', 'SAC / SHC', 'Final Approval'],
    requiresEVC: false,
    requiresUndertaking: false,
    requiresSAC: true
  }
];

export const APPLICATION_TYPE_OPTIONS = [
  { value: 'Extension of Approval (EoA)', description: 'Annual renewal of approval for existing running programs', routeId: 'ROUTE_SCRUTINY_EVC' as RouteId },
  { value: 'Increase in Intake', description: 'Expand student seat capacity in verified programs', routeId: 'ROUTE_SCRUTINY_ONLY' as RouteId },
  { value: 'New Course Introduction', description: 'Add AI, Data Science, Cyber Security, or Green Tech disciplines', routeId: 'ROUTE_SCRUTINY_ONLY' as RouteId },
  { value: 'Closure of Non-viable Programs', description: 'Phased or progressive closure of low-intake courses', routeId: 'ROUTE_EVC_ONLY' as RouteId },
  { value: 'New Technical Campus', description: 'Establishment of a new technical institution or campus', routeId: 'ROUTE_EVC_SAC' as RouteId },
  { value: 'Reduction in Intake', description: 'Reduce approved seats for a running program', routeId: 'ROUTE_SCRUTINY_SAC' as RouteId },
  { value: 'Appeal against Rejection', description: 'Appeal before the Standing Appellate Committee', routeId: 'ROUTE_SAC_APPEAL' as RouteId }
];

const ROUTE_MATCHERS: { routeId: RouteId; keywords: string[] }[] = [
  { routeId: 'ROUTE_SAC_APPEAL', keywords: ['appeal', 'review petition', 'review against'] },
  { routeId: 'ROUTE_EVC_SAC', keywords: ['new technical campus', 'new institution', 'new technical institution', 'establishment of new'] },
  { routeId: 'ROUTE_EVC_ONLY', keywords: ['closure', 'close down'] },
  { routeId: 'ROUTE_SCRUTINY_EVC', keywords: ['extension of approval', 'eoa', 'extension'] },
  { routeId: 'ROUTE_SCRUTINY_SAC', keywords: ['reduction in intake', 'program closure'] },
  {
    routeId: 'ROUTE_SCRUTINY_ONLY',
    keywords: ['increase in intake', 'increase in approved intake', 'new course', 'introduction of new course', 'integrated course', 'addition of integrated']
  }
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function getRoute(routeId: RouteId | undefined): WorkflowRoute | null {
  return WORKFLOW_ROUTES.find((route) => route.id === routeId) ?? null;
}

export function findRoute(applicationType: string): WorkflowRoute | null {
  const normalized = normalize(applicationType);
  for (const matcher of ROUTE_MATCHERS) {
    if (matcher.keywords.some((keyword) => normalized.includes(normalize(keyword)))) {
      return getRoute(matcher.routeId);
    }
  }
  return null;
}

export function resolveRoute(applicationType: string): WorkflowRoute {
  return findRoute(applicationType) ?? WORKFLOW_ROUTES[1];
}

export function routeForApplication(app: Pick<Application, 'type' | 'routeId'>): WorkflowRoute {
  const explicit = getRoute(app.routeId);
  if (explicit) return explicit;
  return resolveRoute(app.type);
}

export function getApplicationStagePath(app: Pick<Application, 'type' | 'routeId' | 'stage'>): ApplicationStage[] {
  const route = routeForApplication(app);
  const stages = [...route.stages];
  const current = canonicalStage(app.stage);
  if (isOperationalStage(current) && !stages.includes(current)) {
    stages.push(current);
    stages.sort((a, b) => STAGE_META[a].order - STAGE_META[b].order);
  }
  return stages;
}

export function stageIndexInRoute(
  app: Pick<Application, 'type' | 'routeId' | 'stage'>,
  stage: ApplicationStage = app.stage
): number {
  return getApplicationStagePath(app).indexOf(canonicalStage(stage));
}

export function isNextStage(
  app: Pick<Application, 'type' | 'routeId' | 'stage'>,
  candidate: ApplicationStage
): boolean {
  const path = getApplicationStagePath(app);
  const currentIndex = path.indexOf(canonicalStage(app.stage));
  return currentIndex >= 0 && path[currentIndex + 1] === canonicalStage(candidate);
}

export function isEarlierStage(
  app: Pick<Application, 'type' | 'routeId' | 'stage'>,
  candidate: ApplicationStage
): boolean {
  const path = getApplicationStagePath(app);
  const currentIndex = path.indexOf(canonicalStage(app.stage));
  const candidateIndex = path.indexOf(canonicalStage(candidate));
  return currentIndex >= 0 && candidateIndex >= 0 && candidateIndex < currentIndex;
}

export function routeRequiresStage(
  app: Pick<Application, 'type' | 'routeId'>,
  stage: ApplicationStage
): boolean {
  return routeForApplication(app).stages.includes(canonicalStage(stage));
}
