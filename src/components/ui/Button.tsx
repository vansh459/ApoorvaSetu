import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold rounded-control transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-swift active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-action text-white shadow-raise hover:bg-action-hover',
  secondary: 'border border-line-strong bg-surface text-ink hover:border-ink-3 hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger text-white shadow-raise hover:bg-danger/90',
  link: 'h-auto px-0 text-accent hover:text-accent-hover hover:underline underline-offset-4'
};

const SIZES: Record<Exclude<ButtonSize, never>, string> = {
  sm: 'h-9 px-3 text-label',
  md: 'h-10 px-4 text-sm'
};

export function buttonClass(options: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  const { variant = 'primary', size = 'md', fullWidth = false, className } = options;
  return cn(
    BASE,
    VARIANTS[variant],
    variant === 'link' ? 'text-sm' : SIZES[size],
    fullWidth && 'w-full',
    className
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    icon,
    iconRight,
    loading = false,
    fullWidth = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={buttonClass({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
      {iconRight}
    </button>
  );
});
