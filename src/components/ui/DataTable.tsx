import * as React from 'react';
import { cn } from '../../utils/cn';
import { EmptyState } from './EmptyState';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  headerClassName?: string;
  cellClassName?: string;
}

export interface DataTableProps<T> {
  caption: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  minWidth?: string;
  stickyHeader?: boolean;
  className?: string;
}

const ALIGN = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right'
};

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
  minWidth = '720px',
  stickyHeader = false,
  className
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-card border border-line bg-surface shadow-raise',
        className
      )}
    >
      <table className="w-full border-collapse" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead className={cn('bg-surface-2', stickyHeader && 'sticky top-0 z-10')}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={column.width ? { width: column.width } : undefined}
                className={cn(
                  'whitespace-nowrap px-4 py-3 text-xs font-medium text-ink-2',
                  ALIGN[column.align ?? 'left'],
                  column.headerClassName
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4">
                {empty ?? (
                  <EmptyState
                    title="Nothing here yet"
                    description="New records will appear here once they are created."
                  />
                )}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                className={cn(
                  'border-t border-line transition-colors duration-150',
                  onRowClick && 'cursor-pointer hover:bg-surface-2/70'
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-3.5 text-sm text-ink',
                      ALIGN[column.align ?? 'left'],
                      column.cellClassName
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
