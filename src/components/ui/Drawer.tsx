import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { IconButton } from './IconButton';
import { useDialogFocus } from './useDialogFocus';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  title?: string;
  description?: string;
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

let drawerCounter = 0;

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  label,
  title,
  description,
  header,
  children,
  footer,
  maxWidth = 'max-w-2xl'
}) => {
  const panelRef = useDialogFocus(isOpen, onClose);
  const titleId = React.useMemo(() => `drawer-title-${++drawerCounter}`, []);

  if (!isOpen) return null;

  return createPortal(
    <div className="case-summary-shell fixed inset-0 z-[70] flex justify-end">
      <div
        className="overlay-enter absolute inset-0 bg-ink/30 backdrop-blur-[6px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ? undefined : label}
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'drawer-enter case-summary-drawer relative z-10 flex h-full w-full flex-col border-l border-line bg-surface shadow-overlay',
          maxWidth
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          {header ?? (
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-sm text-ink-2">{description}</p>}
            </div>
          )}
          <IconButton label="Close panel" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

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
