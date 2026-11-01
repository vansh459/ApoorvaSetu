import * as React from 'react';
import { cn } from '../../utils/cn';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  variant?: 'segmented' | 'underline';
  ariaLabel: string;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  value,
  onChange,
  variant = 'segmented',
  ariaLabel,
  className
}) => (
  <div
    role="group"
    aria-label={ariaLabel}
    className={cn(
      'no-scrollbar max-w-full overflow-x-auto',
      variant === 'segmented'
        ? 'inline-flex items-center gap-1 rounded-control border border-line bg-surface-2 p-1'
        : 'flex items-center gap-6 border-b border-line',
      className
    )}
  >
    {items.map((item) => {
      const active = item.id === value;
      return (
        <button
          key={item.id}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(item.id)}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap transition-colors duration-150',
            variant === 'segmented'
              ? 'h-8 rounded-[8px] px-3 text-label font-medium'
              : '-mb-px h-10 border-b-2 text-label font-medium',
            active
              ? variant === 'segmented'
                ? 'bg-surface text-ink shadow-raise'
                : 'border-ink text-ink'
              : variant === 'segmented'
                ? 'text-ink-2 hover:text-ink'
                : 'border-transparent text-ink-2 hover:text-ink'
          )}
        >
          {item.label}
          {item.count !== undefined && (
            <span
              className={cn(
                'rounded-full px-1.5 text-xs',
                active ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-ink-2'
              )}
            >
              {item.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);
