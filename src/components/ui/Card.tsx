import * as React from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: 'none' | 'sm' | 'md';
  interactive?: boolean;
}

const PADDING: Record<NonNullable<CardProps['padded']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6'
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { padded = 'md', interactive = false, className, children, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-card border border-line bg-surface shadow-raise',
        PADDING[padded],
        interactive && 'card-interactive',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

export interface CardHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, description, action, className }) => (
  <div
    className={cn(
      'flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6',
      className
    )}
  >
    <div className="min-w-0">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {description && <p className="mt-0.5 text-label text-ink-2">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
