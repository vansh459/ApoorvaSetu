import * as React from 'react';
import { cn } from '../../utils/cn';
import type { Tone } from '../../utils/statusTone';

const FILL: Record<Tone, string> = {
  neutral: 'bg-ink-3',
  info: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger'
};

export interface ProgressBarProps {
  value: number;
  max?: number;
  tone?: Tone;
  label?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  tone = 'info',
  label = 'Progress',
  className
}) => {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-2', className)}
    >
      <div
        className={cn('bar-enter h-full w-full rounded-full', FILL[tone])}
        style={
          {
            '--bar-scale': ratio,
            transform: `scaleX(${ratio})`,
            transformOrigin: 'left center'
          } as React.CSSProperties
        }
      />
    </div>
  );
};
