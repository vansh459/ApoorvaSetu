import * as React from 'react';
import { cn } from '../../utils/cn';

export interface TooltipProps {
  label: string;
  side?: 'top' | 'bottom';
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ label, side = 'top', children, className }) => (
  <span className={cn('group relative inline-flex', className)}>
    {children}
    <span
      role="tooltip"
      className={cn(
        'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100',
        side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
      )}
    >
      {label}
    </span>
  </span>
);
