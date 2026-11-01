import { describe, expect, it } from 'vitest';
import {
  addBusinessDays,
  computeDueDate,
  differenceInCalendarDays,
  evaluateSla,
  formatDisplayDate,
  parseDate,
  toIsoDate
} from './dates';

describe('parseDate', () => {
  it('parses ISO dates without timezone drift', () => {
    const date = parseDate('2026-01-31');
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(0);
    expect(date?.getDate()).toBe(31);
  });

  it('parses display dates used by the mock dataset', () => {
    const date = parseDate('21 Oct 2025');
    expect(toIsoDate(date!)).toBe('2025-10-21');
  });

  it('rejects pending placeholders', () => {
    expect(parseDate('Pending')).toBeNull();
    expect(parseDate('N/A')).toBeNull();
    expect(parseDate('')).toBeNull();
  });
});

describe('date arithmetic', () => {
  it('adds calendar days', () => {
    expect(computeDueDate('2026-01-01', 30)).toBe('2026-01-31');
  });

  it('skips weekends in business-day mode', () => {
    // Friday 2 Jan 2026 + 3 business days = Wednesday 7 Jan 2026
    expect(toIsoDate(addBusinessDays('2026-01-02', 3))).toBe('2026-01-07');
  });

  it('computes signed day differences', () => {
    expect(differenceInCalendarDays('2026-01-01', '2026-01-31')).toBe(30);
    expect(differenceInCalendarDays('2026-01-31', '2026-01-01')).toBe(-30);
  });

  it('formats display dates', () => {
    expect(formatDisplayDate('2026-01-31')).toBe('31 Jan 2026');
  });
});

describe('evaluateSla', () => {
  const start = '2026-01-01';
  const due = '2026-01-31';

  it('reports on-track early in the window', () => {
    const result = evaluateSla(start, due, 80, new Date(2026, 0, 10));
    expect(result.tier).toBe('On Track');
    expect(result.daysElapsed).toBe(9);
    expect(result.daysRemaining).toBe(21);
  });

  it('reports approaching at the configured threshold', () => {
    const result = evaluateSla(start, due, 80, new Date(2026, 0, 25));
    expect(result.tier).toBe('Approaching');
    expect(result.daysElapsed).toBe(24);
  });

  it('reports due today on the due date', () => {
    expect(evaluateSla(start, due, 80, new Date(2026, 0, 31)).tier).toBe('Due Today');
  });

  it('reports breached after the due date', () => {
    const result = evaluateSla(start, due, 80, new Date(2026, 1, 1));
    expect(result.tier).toBe('Breached');
    expect(result.daysRemaining).toBe(-1);
  });

  it('freezes the tier when paused', () => {
    expect(evaluateSla(start, due, 80, new Date(2026, 1, 10), true).tier).toBe('Paused');
  });
});
