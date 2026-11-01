import * as React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cn } from '../../utils/cn';

const TONES = {
  success: { icon: CheckCircle2, tile: 'bg-success-soft text-success' },
  error: { icon: AlertCircle, tile: 'bg-danger-soft text-danger' },
  warning: { icon: AlertTriangle, tile: 'bg-warning-soft text-warning' },
  info: { icon: Info, tile: 'bg-accent-soft text-accent' }
} as const;

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 mx-auto flex w-full max-w-sm flex-col gap-2 px-4 sm:bottom-6 sm:px-0"
    >
      {toasts.map((toast) => {
        const tone = TONES[toast.type] ?? TONES.info;
        const Icon = tone.icon;
        return (
          <div
            key={toast.id}
            className="toast-enter pointer-events-auto flex items-start gap-3 rounded-card border border-line bg-surface p-3.5 shadow-overlay"
          >
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-control',
                tone.tile
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <p className="min-w-0 flex-1 pt-1 text-label font-medium text-ink">{toast.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => removeToast(toast.id)}
              className="rounded-md p-1 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
