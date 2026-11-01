import * as React from 'react';
import { Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Tone } from '../../utils/statusTone';

const TONES: Record<Tone, string> = {
  neutral: 'border-line bg-surface-2 text-ink-2',
  info: 'border-accent/15 bg-accent-soft text-accent',
  success: 'border-success/15 bg-success-soft text-success',
  warning: 'border-warning/15 bg-warning-soft text-warning',
  danger: 'border-danger/15 bg-danger-soft text-danger'
};

export interface NoticeProps {
  tone?: Tone;
  title?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  className?: string;
}

export const Notice: React.FC<NoticeProps> = ({
  tone = 'info',
  title,
  children,
  action,
  icon: Icon = Info,
  className
}) => (
  <div className={cn('flex items-start gap-3 rounded-card border px-4 py-3', TONES[tone], className)}>
    <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
    <div className="min-w-0 flex-1">
      {title && <p className="text-label font-semibold">{title}</p>}
      <div className="text-label [&_a]:underline [&_a]:underline-offset-2">{children}</div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
