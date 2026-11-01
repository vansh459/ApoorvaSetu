import * as React from 'react';
import { cn } from '../../utils/cn';

export interface AvatarProps {
  initials: string;
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm'
};

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  src,
  alt = '',
  size = 'md',
  className
}) => {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn('shrink-0 rounded-full object-cover', SIZES[size], className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent',
        SIZES[size],
        className
      )}
    >
      {initials}
    </span>
  );
};
