import type { SlaTier } from '../types';

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

const DAY_MS = 24 * 60 * 60 * 1000;

let nowProvider: () => Date = () => new Date();

export function getNow(): Date {
  return nowProvider();
}

export function setNowProvider(provider: () => Date): void {
  nowProvider = provider;
}

export function setDemoTimeOffsetDays(days: number): void {
  const base = Date.now();
  nowProvider = () => new Date(base + days * DAY_MS);
}

export function resetNow(): void {
  nowProvider = () => new Date();
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseDate(value: string | Date | undefined | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : startOfDay(value);
  const trimmed = value.trim();
  if (!trimmed || /^(pending|n\/a|—|-)$/i.test(trimmed)) return null;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) {
    const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const displayMatch = /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/.exec(trimmed);
  if (displayMatch) {
    const month = MONTHS[displayMatch[2].slice(0, 3).toLowerCase()];
    if (month === undefined) return null;
    return new Date(Number(displayMatch[3]), month, Number(displayMatch[1]));
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed);
}

export function toIsoDate(value: string | Date = getNow()): string {
  const date = value instanceof Date ? value : parseDate(value) || getNow();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(value: string | Date = getNow()): string {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return String(value);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function addCalendarDays(value: string | Date, days: number): Date {
  const date = value instanceof Date ? value : parseDate(value) || getNow();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function addMonths(value: string | Date, months: number): Date {
  const date = value instanceof Date ? value : parseDate(value) || getNow();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function addBusinessDays(value: string | Date, days: number): Date {
  let remaining = Math.max(0, Math.floor(days));
  let cursor = value instanceof Date ? startOfDay(value) : parseDate(value) || startOfDay(getNow());
  while (remaining > 0) {
    cursor = addCalendarDays(cursor, 1);
    if (!isWeekend(cursor)) remaining -= 1;
  }
  return cursor;
}

export function addDaysByMode(value: string | Date, days: number, businessDaysOnly: boolean): Date {
  return businessDaysOnly ? addBusinessDays(value, days) : addCalendarDays(value, days);
}

export function differenceInCalendarDays(from: string | Date, to: string | Date): number {
  const start = typeof from === 'string' ? parseDate(from) : startOfDay(from);
  const end = typeof to === 'string' ? parseDate(to) : startOfDay(to);
  if (!start || !end) return 0;
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

export function daysUntil(value: string | Date, now: Date = getNow()): number {
  return differenceInCalendarDays(now, value);
}

export function computeDueDate(
  start: string | Date,
  slaDays: number,
  businessDaysOnly = false
): string {
  return toIsoDate(addDaysByMode(start, slaDays, businessDaysOnly));
}

export interface SlaInfo {
  tier: SlaTier;
  daysElapsed: number;
  daysRemaining: number;
  totalDays: number;
  dueDate: string | null;
}

export function evaluateSla(
  start: string | Date | undefined,
  due: string | Date | undefined,
  approachingPct = 80,
  now: Date = getNow(),
  paused = false
): SlaInfo {
  const startDate = start ? parseDate(start) : null;
  const dueDate = due ? parseDate(due) : null;

  if (paused) {
    return {
      tier: 'Paused',
      daysElapsed: startDate ? Math.max(0, differenceInCalendarDays(startDate, now)) : 0,
      daysRemaining: dueDate ? differenceInCalendarDays(now, dueDate) : 0,
      totalDays: startDate && dueDate ? Math.max(0, differenceInCalendarDays(startDate, dueDate)) : 0,
      dueDate: dueDate ? toIsoDate(dueDate) : null
    };
  }

  if (!startDate || !dueDate) {
    return { tier: 'On Track', daysElapsed: 0, daysRemaining: 0, totalDays: 0, dueDate: null };
  }

  const totalDays = Math.max(0, differenceInCalendarDays(startDate, dueDate));
  const daysElapsed = Math.max(0, differenceInCalendarDays(startDate, now));
  const daysRemaining = differenceInCalendarDays(now, dueDate);
  const approachingThreshold = Math.floor((totalDays * approachingPct) / 100);

  let tier: SlaTier = 'On Track';
  if (daysRemaining < 0) tier = 'Breached';
  else if (daysRemaining === 0) tier = 'Due Today';
  else if (daysElapsed >= approachingThreshold) tier = 'Approaching';

  return { tier, daysElapsed, daysRemaining, totalDays, dueDate: toIsoDate(dueDate) };
}

export function tierSeverity(tier: SlaTier): 'low' | 'medium' | 'high' | 'critical' {
  switch (tier) {
    case 'Breached':
      return 'critical';
    case 'Due Today':
      return 'high';
    case 'Approaching':
      return 'medium';
    default:
      return 'low';
  }
}
