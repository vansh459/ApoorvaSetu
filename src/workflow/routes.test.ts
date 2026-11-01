import { describe, expect, it } from 'vitest';
import {
  WORKFLOW_ROUTES,
  getApplicationStagePath,
  getRoute,
  isEarlierStage,
  isNextStage,
  resolveRoute,
  routeForApplication
} from './routes';
import { OPERATIONAL_STAGES } from './stages';
import { makeApplication } from './__tests__/fixtures';

describe('workflow routes', () => {
  it('defines a contiguous, operational stage path for every route', () => {
    for (const route of WORKFLOW_ROUTES) {
      expect(route.stages[0]).toBe('Submitted');
      expect(route.stages[route.stages.length - 1]).toBe('Final Approval');
      for (const stage of route.stages) {
        expect(OPERATIONAL_STAGES).toContain(stage);
      }
      expect(new Set(route.stages).size).toBe(route.stages.length);
    }
  });

  it('routes an Extension of Approval through scrutiny and EVC', () => {
    const route = resolveRoute('Extension of Approval (EoA)');
    expect(route.id).toBe('ROUTE_SCRUTINY_EVC');
    expect(route.stages).toEqual([
      'Submitted',
      'Scrutiny / Re-scrutiny',
      'Expert Visit Committee (EVC)',
      'Approval (Subject to Undertaking)',
      'Final Approval'
    ]);
  });

  it('routes a new technical campus through EVC and SAC', () => {
    const route = resolveRoute('New Technical Campus');
    expect(route.id).toBe('ROUTE_EVC_SAC');
    expect(route.stages).toContain('SAC / SHC');
  });

  it('never sends scrutiny-only applications into EVC or SAC', () => {
    const route = resolveRoute('Increase in Intake');
    expect(route.id).toBe('ROUTE_SCRUTINY_ONLY');
    expect(route.stages).not.toContain('Expert Visit Committee (EVC)');
    expect(route.stages).not.toContain('SAC / SHC');
  });

  it('skips scrutiny for EVC-only closures', () => {
    const route = resolveRoute('Closure of Non-viable Programs');
    expect(route.id).toBe('ROUTE_EVC_ONLY');
    expect(route.stages).not.toContain('Scrutiny / Re-scrutiny');
  });

  it('falls back to the scrutiny + EVC route for unknown application types', () => {
    const route = resolveRoute('Unclassified Statutory Request');
    expect(route.id).toBe('ROUTE_SCRUTINY_EVC');
  });

  it('prefers an explicit routeId over type matching', () => {
    const app = makeApplication({ type: 'Extension of Approval (EoA)', routeId: 'ROUTE_EVC_ONLY' });
    expect(routeForApplication(app).id).toBe('ROUTE_EVC_ONLY');
  });

  it('resolves next and earlier stages against the application route', () => {
    const app = makeApplication({ stage: 'Scrutiny / Re-scrutiny' });
    expect(isNextStage(app, 'Expert Visit Committee (EVC)')).toBe(true);
    expect(isNextStage(app, 'SAC / SHC')).toBe(false);
    expect(isEarlierStage(app, 'Submitted')).toBe(true);
    expect(isEarlierStage(app, 'Final Approval')).toBe(false);
    expect(getApplicationStagePath(app)).toContain('Final Approval');
  });

  it('rejects unknown route identifiers', () => {
    expect(getRoute(undefined)).toBeNull();
  });
});
