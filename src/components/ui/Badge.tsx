import * as React from 'react';
import { cn } from '../../utils/cn';
import type { Tone } from '../../utils/statusTone';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-2',
  info: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger'
};

export interface BadgeProps {
  tone?: Tone;
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', size = 'sm', children, className }) => (
  <span
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-full font-medium',
      TONES[tone],
      size === 'sm' ? 'h-5 px-2 text-xs' : 'h-6 px-2.5 text-xs',
      className
    )}
  >
    {children}
  </span>
);
