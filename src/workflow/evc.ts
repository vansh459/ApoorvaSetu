import type { Application, EVCVisit, EVCVisitChecklistItem } from '../types';
import { canonicalStage } from './stages';
import { getApplicationStagePath, isNextStage, routeRequiresStage } from './routes';
import { evcReportWindow } from './sla';
import { DEFAULT_WORKFLOW_CONFIG } from './config';
import { computeDueDate, getNow, parseDate, toIsoDate } from '../utils/dates';

export interface EVC_CHECKLIST_SECTION {
  category: string;
  items: { id: string; description: string }[];
}

export const EVC_CHECKLIST_SECTIONS: EVC_CHECKLIST_SECTION[] = [
  {
    category: '1. Land & Built-up Space',
    items: [
      { id: '1.1', description: 'Continuous land parcel verification without public right-of-way bifurcation' },
      { id: '1.2', description: 'Approved municipal master plan and building completion certificate on record' },
      { id: '1.3', description: 'Administrative and instructional carpet area satisfies minimum norm for proposed intake' }
    ]
  },
  {
    category: '2. Laboratories & Computing Facilities',
    items: [
      { id: '2.1', description: 'Minimum 1:4 student to PC ratio with licensed system and application software' },
      { id: '2.2', description: 'Dedicated IoT / AI / Emerging Technology lab with equipment operational' },
      { id: '2.3', description: 'High-speed internet bandwidth (>100 Mbps dedicated leased line) operational' }
    ]
  },
  {
    category: '3. Faculty Cadre Ratio & Qualifications',
    items: [
      { id: '3.1', description: 'Cadre ratio 1:2:6 (Professor : Associate Professor : Assistant Professor) verified' },
      { id: '3.2', description: 'Faculty appointment through duly constituted university selection committee' },
      { id: '3.3', description: 'Biometric / Aadhaar-based attendance register active and mapped to AICTE portal' }
    ]
  },
  {
    category: '4. Safety & Inclusive Campus Facilities',
    items: [
      { id: '4.1', description: 'Valid Fire Safety Certificate from competent state authority' },
      { id: '4.2', description: 'Barrier-free environment with ramps, lifts, and disabled-friendly restrooms' },
      { id: '4.3', description: 'Anti-Ragging Committee and Internal Complaints Committee (ICC) constituted and displayed' }
    ]
  }
];

export const EVC_CHECKLIST_ITEMS = EVC_CHECKLIST_SECTIONS.flatMap((section) => section.items);

export interface ChecklistProgress {
  total: number;
  assessed: number;
  passed: number;
  failed: number;
  complete: boolean;
}

export function checklistProgress(visit: EVCVisit | undefined | null): ChecklistProgress {
  const marks: EVCVisitChecklistItem[] = visit?.checklist ?? [];
  const passed = marks.filter((mark) => mark.passed).length;
  return {
    total: EVC_CHECKLIST_ITEMS.length,
    assessed: marks.length,
    passed,
    failed: marks.length - passed,
    complete: marks.length === EVC_CHECKLIST_ITEMS.length
  };
}

export function activeVisitFor(
  application: Application,
  visits: EVCVisit[]
): EVCVisit | undefined {
  return visits.find(
    (visit) =>
      visit.status !== 'Cancelled' &&
      (visit.id === application.evcVisitId || visit.applicationId === application.id)
  );
}

/**
 * Seeded visits predate the SLA fields: they carry a display `date` but no
 * `scheduledAt`/`reportDueAt`, which leaves them permanently on-track. Derive
 * the schedule on hydration so the queue and sweep see their real deadline.
 */
export function normalizeEVCVisit(
  visit: EVCVisit,
  reportSlaDays = DEFAULT_WORKFLOW_CONFIG.evcReportSlaDays,
  businessDaysOnly = DEFAULT_WORKFLOW_CONFIG.businessDaysOnly
): EVCVisit {
  if (visit.status === 'Cancelled') return visit;
  const start = visit.scheduledAt ?? visit.date;
  if (!parseDate(start)) return visit;
  const scheduledAt = visit.scheduledAt ?? toIsoDate(start);
  const reportDueAt =
    visit.reportDueAt ?? computeDueDate(scheduledAt, reportSlaDays, businessDaysOnly);
  if (scheduledAt === visit.scheduledAt && reportDueAt === visit.reportDueAt) return visit;
  return { ...visit, scheduledAt, reportDueAt };
}

export type EVCQueueState = 'Awaiting scheduling' | 'Scheduled' | 'Report overdue' | 'Completed';

export interface EVCQueueRow {
  application: Application;
  visit?: EVCVisit;
  state: EVCQueueState;
  daysOverdue: number;
}

const STATE_ORDER: Record<EVCQueueState, number> = {
  'Report overdue': 0,
  'Awaiting scheduling': 1,
  Scheduled: 2,
  Completed: 3
};

export function buildEVCQueue(
  applications: Application[],
  visits: EVCVisit[],
  now: Date = getNow()
): EVCQueueRow[] {
  const rows: EVCQueueRow[] = [];

  for (const application of applications) {
    if (application.status === 'Approved' || application.status === 'Rejected') continue;
    if (!routeRequiresStage(application, 'Expert Visit Committee (EVC)')) continue;

    const path = getApplicationStagePath(application);
    const currentIndex = path.indexOf(canonicalStage(application.stage));
    const evcIndex = path.indexOf('Expert Visit Committee (EVC)');
    if (currentIndex !== evcIndex) continue;

    const visit = activeVisitFor(application, visits);
    let state: EVCQueueState = 'Awaiting scheduling';
    let daysOverdue = 0;

    if (visit) {
      if (visit.reportSubmitted || visit.status === 'Completed') {
        state = 'Completed';
      } else {
        const window = evcReportWindow(visit, now);
        daysOverdue = window.daysOverdue;
        state = window.tier === 'Breached' ? 'Report overdue' : 'Scheduled';
      }
    }

    rows.push({ application, visit, state, daysOverdue });
  }

  return rows.sort((a, b) => {
    const order = STATE_ORDER[a.state] - STATE_ORDER[b.state];
    if (order !== 0) return order;
    return (a.visit?.date ?? a.application.stageDueAt ?? '').localeCompare(
      b.visit?.date ?? b.application.stageDueAt ?? ''
    );
  });
}

export function evcScheduleCandidates(
  applications: Application[],
  visits: EVCVisit[]
): Application[] {
  return applications.filter((application) => {
    if (application.status === 'Approved' || application.status === 'Rejected') return false;
    if (application.status === 'Returned') return false;
    if (!routeRequiresStage(application, 'Expert Visit Committee (EVC)')) return false;

    const atEVC = canonicalStage(application.stage) === 'Expert Visit Committee (EVC)';
    if (!atEVC && !isNextStage(application, 'Expert Visit Committee (EVC)')) return false;

    return !activeVisitFor(application, visits);
  });
}

/**
 * Legacy seed visits were created without an application link. Link them by
 * institute once so the queue, SLA sweep and workflow guards see one case.
 */
export function linkLegacyVisits(
  applications: Application[],
  visits: EVCVisit[]
): { applications: Application[]; visits: EVCVisit[]; changed: boolean } {
  let changed = false;
  const claimed = new Set<string>();
  const linkedVisits = visits.map((visit) => {
    if (visit.applicationId || visit.status === 'Cancelled') return visit;
    const candidate = applications.find(
      (app) =>
        app.instituteId === visit.instituteId &&
        !app.evcVisitId &&
        !claimed.has(app.id) &&
        app.status !== 'Approved' &&
        app.status !== 'Rejected' &&
        (canonicalStage(app.stage) === 'Expert Visit Committee (EVC)' ||
          isNextStage(app, 'Expert Visit Committee (EVC)'))
    );
    if (!candidate) return visit;
    claimed.add(candidate.id);
    changed = true;
    return { ...visit, applicationId: candidate.id };
  });

  if (!changed) return { applications, visits, changed };

  const applicationsById = new Map(linkedVisits.map((visit) => [visit.applicationId, visit]));
  const linkedApplications = applications.map((app) => {
    const visit = applicationsById.get(app.id);
    if (!visit || app.evcVisitId) return app;
    return { ...app, evcVisitId: visit.id };
  });

  return { applications: linkedApplications, visits: linkedVisits, changed };
}
