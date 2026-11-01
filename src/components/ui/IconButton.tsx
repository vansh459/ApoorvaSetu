import * as React from 'react';
import { cn } from '../../utils/cn';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'secondary';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', variant = 'ghost', className, children, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-control text-ink-2 transition-colors duration-150 hover:text-ink active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        variant === 'ghost' ? 'hover:bg-surface-2' : 'border border-line bg-surface hover:bg-surface-2',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
