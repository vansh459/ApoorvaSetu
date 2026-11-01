import * as React from 'react';
import { cn } from '../../utils/cn';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const SIZES = {
  sm: 'h-4 w-4 border',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-2'
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', label = 'Loading', className }) => (
  <span role="status" aria-label={label} className={cn('inline-flex', className)}>
    <span
      className={cn(
        'animate-spin rounded-full border-current border-t-transparent',
        SIZES[size]
      )}
    />
  </span>
);
