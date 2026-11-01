import { describe, expect, it } from 'vitest';
import { buildCsv, escapeCsvValue } from './csv';

describe('escapeCsvValue', () => {
  it('quotes plain values and keeps numbers readable', () => {
    expect(escapeCsvValue('Northern')).toBe('"Northern"');
    expect(escapeCsvValue(42)).toBe('"42"');
    expect(escapeCsvValue(false)).toBe('"false"');
  });

  it('writes an empty quoted cell for null and undefined', () => {
    expect(escapeCsvValue(null)).toBe('""');
    expect(escapeCsvValue(undefined)).toBe('""');
  });

  it('doubles embedded quotes so fields stay aligned', () => {
    expect(escapeCsvValue('Lease "Deed" 2025')).toBe('"Lease ""Deed"" 2025"');
  });
});

describe('buildCsv', () => {
  const columns = [
    { key: 'id', label: 'Application ID' },
    { key: 'region', label: 'Region' }
  ];

  it('starts with a UTF-8 byte order mark and uses CRLF rows', () => {
    const csv = buildCsv(columns, [{ id: 'AICTE/2026/1', region: 'Northern' }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"Application ID","Region"\r\n');
    expect(csv).toContain('"AICTE/2026/1","Northern"\r\n');
  });

  it('emits the header even when there are no rows', () => {
    expect(buildCsv(columns, [])).toBe('\uFEFF"Application ID","Region"\r\n');
  });

  it('follows column order and fills gaps for missing keys', () => {
    const csv = buildCsv(columns, [{ region: 'Southern', id: 'AICTE/2026/2', extra: 'ignored' }]);
    expect(csv).toContain('"AICTE/2026/2","Southern"');
    expect(csv).not.toContain('ignored');

    const withGap = buildCsv(columns, [{ id: 'AICTE/2026/3' }]);
    expect(withGap).toContain('"AICTE/2026/3",""');
  });
});
