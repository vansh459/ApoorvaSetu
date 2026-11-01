import * as React from 'react';
import { cn } from '../../utils/cn';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div aria-hidden="true" className={cn('animate-pulse rounded-control bg-line/60', className)} />
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className
}) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        className={cn('h-3', index === lines - 1 ? 'w-2/3' : 'w-full')}
      />
    ))}
  </div>
);
