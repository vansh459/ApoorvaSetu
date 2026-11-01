import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

const CONTROL =
  'w-full rounded-control border border-line-strong bg-surface text-sm text-ink transition-colors duration-150 placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-accent disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-2 aria-[invalid=true]:border-danger';

export interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Field: React.FC<FieldProps> = ({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className
}) => (
  <div className={cn('min-w-0', className)}>
    <label htmlFor={htmlFor} className="mb-1.5 block text-label font-medium text-ink">
      {label}
      {required && <span className="ml-0.5 text-danger">*</span>}
    </label>
    {children}
    {error ? (
      <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-xs text-danger">
        {error}
      </p>
    ) : (
      hint && (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-ink-2">
          {hint}
        </p>
      )
    )}
  </div>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(CONTROL, 'h-10 px-3', className)} {...rest} />;
  }
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(CONTROL, 'px-3 py-2.5', className)} {...rest} />;
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(CONTROL, 'h-10 appearance-none pl-3 pr-9', className)}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
        aria-hidden="true"
      />
    </div>
  );
});
