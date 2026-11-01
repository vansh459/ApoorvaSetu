import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface StatTileProps {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  delta,
  icon: Icon,
  onClick,
  className
}) => {
  const content = (
    <>
      <div className="flex items-center gap-1.5">
        {Icon && (
          <Icon className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.75} aria-hidden="true" />
        )}
        <p className="text-label text-ink-2">{label}</p>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      {delta && <div className="mt-3 text-xs text-ink-2">{delta}</div>}
    </>
  );

  const shell = cn(
    'rounded-card border border-line bg-surface p-5 text-left shadow-raise',
    onClick && 'card-interactive w-full cursor-pointer',
    className
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={shell}>
        {content}
      </button>
    );
  }

  return <div className={shell}>{content}</div>;
};
