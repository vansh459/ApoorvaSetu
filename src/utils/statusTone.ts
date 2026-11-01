export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const BY_STATUS: Record<string, Tone> = {
  active: 'info',
  inprogress: 'info',
  scrutiny: 'info',
  'evcscheduled': 'info',
  submitted: 'info',
  requested: 'info',
  scheduled: 'info',
  acknowledged: 'warning',
  pending: 'warning',
  pendingreview: 'warning',
  undertakingpending: 'warning',
  duetoday: 'warning',
  approaching: 'warning',
  expiringsoon: 'warning',
  awaitingscheduling: 'warning',
  returned: 'warning',
  medium: 'warning',
  high: 'warning',
  approved: 'success',
  completed: 'success',
  verified: 'success',
  resolved: 'success',
  valid: 'success',
  ontrack: 'success',
  actionrequired: 'danger',
  critical: 'danger',
  expired: 'danger',
  noticeissued: 'danger',
  rejected: 'danger',
  overdue: 'danger',
  breached: 'danger',
  reportoverdue: 'danger',
  escalated: 'danger',
  open: 'danger',
  awaiting: 'warning',
  paused: 'neutral',
  draft: 'neutral',
  closed: 'neutral',
  low: 'neutral',
  unknown: 'neutral'
};

export function normalizeStatus(status: string): string {
  return status.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

export function statusTone(status: string, fallback: Tone = 'neutral'): Tone {
  return BY_STATUS[normalizeStatus(status)] ?? fallback;
}

export function severityTone(severity: string): Tone {
  const key = severity.toLowerCase();
  if (key === 'critical') return 'danger';
  if (key === 'high') return 'warning';
  if (key === 'medium') return 'warning';
  return 'neutral';
}
