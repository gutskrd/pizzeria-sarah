'use client';

import { useEffect, useRef } from 'react';
import { CloseIcon } from '@/components/ui/icons';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Prevent closing via Escape/backdrop (e.g. while uploading). */
  locked?: boolean;
};

const WIDTHS = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' };

/**
 * Accessible modal built on the native <dialog> element (focus trap, Escape,
 * top layer). Full screen on phones, centred panel on larger screens.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', locked = false }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-titel"
      aria-describedby={description ? 'dialog-omschrijving' : undefined}
      onCancel={(e) => {
        e.preventDefault();
        if (!locked) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !locked) onClose();
      }}
      className={`m-0 h-[100dvh] max-h-none w-full max-w-none bg-white p-0 text-ink backdrop:bg-ink/50 sm:m-auto sm:h-auto sm:max-h-[90dvh] sm:rounded-lg sm:shadow-2xl ${WIDTHS[size]}`}
    >
      {open && (
        <div className="flex h-full max-h-[100dvh] flex-col sm:max-h-[90dvh]">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 id="dialog-titel" className="font-display text-2xl leading-tight">
                {title}
              </h2>
              {description && (
                <p id="dialog-omschrijving" className="mt-1 text-[0.95rem] text-muted">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={locked}
              className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted hover:bg-paper hover:text-ink disabled:opacity-40"
              aria-label="Sluiten"
            >
              <CloseIcon size={22} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-line bg-paper/60 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
