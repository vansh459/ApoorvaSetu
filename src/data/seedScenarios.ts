export type SeedScenarioTier =
  | 'On Track'
  | 'Approaching'
  | 'Due Today'
  | 'Breached'
  | 'Paused'
  | 'Overdue'
  | 'Expired'
  | 'Verified'
  | 'Pending';

export interface SeedScenario {
  id: string;
  title: string;
  tier: SeedScenarioTier;
  entityType: 'Application' | 'EVC' | 'Undertaking' | 'Document';
  entityId: string;
  summary: string;
  lookFor: string;
  link: string;
  linkLabel: string;
}

export interface DemoClockPreset {
  days: number;
  label: string;
  hint: string;
}

export const DEMO_CLOCK_PRESETS: DemoClockPreset[] = [
  { days: 0, label: 'Today', hint: 'Restore the live clock' },
  { days: 3, label: '+3d', hint: 'First escalation tier' },
  { days: 7, label: '+7d', hint: 'Second tier and lease expiry' },
  { days: 14, label: '+14d', hint: 'Third tier for long breaches' }
];

/**
 * Every entry points at a record that ships with the demo seed. Dates are
 * anchored to the day the app starts, so the tiers stay true however long the
 * project sits between demos.
 */
export const SEED_SCENARIOS: SeedScenario[] = [
  {
    id: 'on-track',
    title: 'On track in EVC',
    tier: 'On Track',
    entityType: 'Application',
    entityId: 'AICTE/2026/12876',
    summary:
      'ABC Institute of Tech entered the Expert Visit Committee stage four days ago with a visit booked in six days.',
    lookFor: 'The stage deadline is 17 days away and no alert is raised for this case.',
    link: '/applications',
    linkLabel: 'Open applications'
  },
  {
    id: 'approaching',
    title: 'Approaching the scrutiny deadline',
    tier: 'Approaching',
    entityType: 'Application',
    entityId: 'AICTE/2026/12875',
    summary:
      'XYZ College of Engg. has spent 26 of its 30 scrutiny days and has four days left to clear the stage.',
    lookFor: 'An amber approaching alert, targeted at the Regional Officer and AICTE Admin.',
    link: '/applications',
    linkLabel: 'Open applications'
  },
  {
    id: 'due-today',
    title: 'Due today at SAC / SHC',
    tier: 'Due Today',
    entityType: 'Application',
    entityId: 'AICTE/2026/12874',
    summary:
      'Global Institute reaches the last day of its 21-day Standing Appellate Committee window today.',
    lookFor: 'A high-severity due-today alert; the tier upgrades to breached after midnight.',
    link: '/applications',
    linkLabel: 'Open applications'
  },
  {
    id: 'breached',
    title: 'Breached scrutiny deadline',
    tier: 'Breached',
    entityType: 'Application',
    entityId: 'AICTE/2026/12867',
    summary:
      'Apex School of Architecture is 12 days past its scrutiny deadline and has escalated to level 2.',
    lookFor: 'A critical alert plus an escalation addressed to the AICTE Admin and Regional Officer.',
    link: '/alerts',
    linkLabel: 'Open alerts'
  },
  {
    id: 'returned',
    title: 'Returned with a recorded deficiency',
    tier: 'Paused',
    entityType: 'Application',
    entityId: 'AICTE/2026/12869',
    summary:
      'GGSIPU was returned at scrutiny for an illegible state NOC. The SLA clock is paused until resubmission.',
    lookFor: 'The paused tier, the deficiency code, and the return note on the case timeline.',
    link: '/applications',
    linkLabel: 'Open applications'
  },
  {
    id: 'evc-overdue',
    title: 'EVC inspection report overdue',
    tier: 'Overdue',
    entityType: 'EVC',
    entityId: 'EVC-8801',
    summary:
      'The NIT Rourkela inspection took place 13 days ago; the report was due six days ago and has not been filed.',
    lookFor: 'The EVC queue marks the visit as report overdue and raises a level-1 escalation.',
    link: '/evc-scheduling',
    linkLabel: 'Open EVC scheduling'
  },
  {
    id: 'undertaking-overdue',
    title: 'Undertaking evidence overdue',
    tier: 'Overdue',
    entityType: 'Undertaking',
    entityId: 'UND-2601',
    summary:
      'Techno Institute has not submitted the barrier-free environment affidavit, due 12 days ago.',
    lookFor: 'A critical undertaking alert and escalation in the compliance workspace.',
    link: '/compliance',
    linkLabel: 'Open compliance'
  },
  {
    id: 'lease-expiring',
    title: 'Lease expiring in seven days',
    tier: 'Approaching',
    entityType: 'Document',
    entityId: 'DOC-507',
    summary:
      'The registered 30-year lease deed for ABC Institute of Tech reaches its validity limit in seven days.',
    lookFor: 'The critical expiry tier, the renewal action, and the document expiry alert.',
    link: '/documents',
    linkLabel: 'Open documents'
  },
  {
    id: 'lease-expired',
    title: 'Lease already expired',
    tier: 'Expired',
    entityType: 'Document',
    entityId: 'DOC-501',
    summary:
      'The registered land deed and possession certificate for ABC Institute of Tech lapsed 45 days ago.',
    lookFor: 'A critical expired alert and a level-3 escalation for the long-running breach.',
    link: '/documents',
    linkLabel: 'Open documents'
  },
  {
    id: 'verified-renewal',
    title: 'Verified renewal supersedes the old NOC',
    tier: 'Verified',
    entityType: 'Document',
    entityId: 'DOC-509',
    summary:
      'Techno Institute renewed its fire safety NOC. The verified renewal supersedes the lapsed 2019-2024 certificate.',
    lookFor: 'The renewal chain from DOC-510 to DOC-509 and the absence of an expiry alert on both rows.',
    link: '/documents',
    linkLabel: 'Open documents'
  },
  {
    id: 'pending-verification',
    title: 'Awaiting officer verification',
    tier: 'Pending',
    entityType: 'Document',
    entityId: 'DOC-506',
    summary:
      'The barrier-free affidavit and the faculty retention undertaking from Techno Institute are submitted and awaiting a human verifier.',
    lookFor: 'The pending queue; verification records the officer name as the competent authority.',
    link: '/compliance',
    linkLabel: 'Open compliance'
  },
  {
    id: 'human-decision',
    title: 'Approval recorded by a competent authority',
    tier: 'Verified',
    entityType: 'Application',
    entityId: 'AICTE/2026/12872',
    summary:
      'Sunrise College received final approval with the Member Secretary recorded as the competent authority.',
    lookFor: 'The decision block on the case summary shows the human authority; automation never decides.',
    link: '/applications',
    linkLabel: 'Open applications'
  }
];
