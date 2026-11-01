import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon,
  action,
  className
}) => (
  <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
    {Icon && (
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-card bg-surface-2 text-ink-3">
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
    )}
    <p className="text-sm font-semibold text-ink">{title}</p>
    {description && <p className="mt-1 max-w-sm text-label text-ink-2">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
