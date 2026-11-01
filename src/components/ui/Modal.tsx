import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { IconButton } from './IconButton';
import { useDialogFocus } from './useDialogFocus';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  maxWidth?: string;
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl'
};

let modalCounter = 0;

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  maxWidth
}) => {
  const panelRef = useDialogFocus(isOpen, onClose);
  const titleId = React.useMemo(() => `modal-title-${++modalCounter}`, []);
  const descriptionId = React.useMemo(() => `modal-description-${modalCounter}`, []);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="overlay-enter absolute inset-0 bg-ink/30 backdrop-blur-[6px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'panel-enter relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-modal border border-line bg-surface shadow-overlay sm:my-8 sm:max-h-[85vh] sm:rounded-modal',
          maxWidth ?? SIZES[size]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
              {title}
            </h2>
            {subtitle && (
              <p id={descriptionId} className="mt-0.5 text-sm text-ink-2">
                {subtitle}
              </p>
            )}
          </div>
          <IconButton label="Close dialog" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface px-5 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
