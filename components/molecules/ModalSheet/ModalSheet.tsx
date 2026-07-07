'use client';

import React, { useEffect, useId } from 'react';

import { CloseIcon } from '@/components/icons';
import {
  ModalSheetWidth,
  getModalPanelClasses,
  MODAL_OVERLAY_CLASSES,
} from '@/components/molecules/ModalSheet/ModalSheetUtil';

export interface ModalSheetProps {
  /** Heading shown in the panel header and wired as the dialog's accessible name. */
  title: string;
  /** Called when the user dismisses the sheet (✕, backdrop click, or Escape). */
  onClose: () => void;
  /** The sheet body. */
  children: React.ReactNode;
  /** Optional sticky footer (e.g. form actions). */
  footer?: React.ReactNode;
  /** Panel max-width preset. */
  width?: ModalSheetWidth;
  /** Optional className for styling overrides on the panel. */
  className?: string;
}

/**
 * A dismissible modal container shared by the issue detail popover and the create modal.
 * Centers on `sm+` and docks to the bottom as a sheet on small screens (the responsive
 * plan's breakpoint-switched container). Closes on ✕, a backdrop click, or Escape; the
 * panel stops propagation so clicks inside never dismiss. Labelled by its title for
 * screen readers.
 */
export const ModalSheet = ({
  title,
  onClose,
  children,
  footer,
  width = 'md',
  className = '',
}: ModalSheetProps) => {
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className={MODAL_OVERLAY_CLASSES} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className={getModalPanelClasses(width, className)}
      >
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <h2
            id={titleId}
            className="text-[0.9375rem] font-[var(--font-weight-semibold)] text-content"
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="ml-auto flex items-center rounded p-1 text-content-muted transition-colors hover:bg-neutral-light hover:text-content"
          >
            <CloseIcon size={16} />
          </button>
        </header>

        <div className="min-h-0 grow overflow-auto px-4 py-3">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};
