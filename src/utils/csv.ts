export interface CsvColumn {
  key: string;
  label: string;
}

export type CsvRow = Record<string, string | number | boolean | null | undefined>;

export function escapeCsvValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function buildCsv(columns: CsvColumn[], rows: CsvRow[]): string {
  const header = columns.map((column) => escapeCsvValue(column.label)).join(',');
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvValue(row[column.key])).join(',')
  );
  return `\uFEFF${[header, ...body].join('\r\n')}\r\n`;
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
