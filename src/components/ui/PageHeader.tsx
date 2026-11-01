import * as React from 'react';
import { cn } from '../../utils/cn';

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  meta,
  className
}) => (
  <div
    className={cn(
      'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
      className
    )}
  >
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight text-ink [overflow-wrap:break-word]">
        {title}
      </h1>
      {description && (
        <p className="mt-1 max-w-[62ch] text-sm text-ink-2 [text-wrap:pretty]">{description}</p>
      )}
      {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
