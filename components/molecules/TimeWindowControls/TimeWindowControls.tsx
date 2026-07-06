import React from 'react';

import type { Zoom } from '@/lib/gantt/scale';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import {
  ZOOM_OPTIONS,
  isZoom,
} from '@/components/molecules/TimeWindowControls/TimeWindowControlsUtil';

export interface TimeWindowControlsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The active zoom (controlled). */
  zoom: Zoom;
  /** Called when the zoom selector changes. */
  onZoomChange: (zoom: Zoom) => void;
  /** Shift the window one zoom unit earlier. */
  onPrev: () => void;
  /** Recenter the window on today. */
  onToday: () => void;
  /** Shift the window one zoom unit later. */
  onNext: () => void;
  /** Optional className for styling overrides. */
  className?: string;
}

const navButtonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-raised text-content transition-colors hover:bg-neutral-light';

/**
 * Timeline zoom selector (Week/Month/Quarter/Year) paired with ◀ Today ▶ navigation.
 * Controlled: the parent owns the zoom + window and re-frames on each callback.
 */
export const TimeWindowControls = ({
  zoom,
  onZoomChange,
  onPrev,
  onToday,
  onNext,
  className = '',
  ...props
}: TimeWindowControlsProps) => {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`} {...props}>
      <label className="inline-flex items-center gap-1.5 text-[0.875rem] text-content-secondary">
        <span className="sr-only">Zoom</span>
        <select
          value={zoom}
          onChange={(event) => {
            if (isZoom(event.target.value)) onZoomChange(event.target.value);
          }}
          className="h-8 rounded-md border border-border bg-surface-raised px-2 text-[0.875rem] font-[var(--font-weight-semibold)] text-content"
        >
          {ZOOM_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="inline-flex items-center gap-1">
        <button type="button" aria-label="Previous window" onClick={onPrev} className={navButtonClass}>
          <ChevronLeftIcon size={16} aria-hidden />
        </button>
        <button
          type="button"
          onClick={onToday}
          className="h-8 rounded-md border border-border bg-surface-raised px-3 text-[0.875rem] font-[var(--font-weight-semibold)] text-content transition-colors hover:bg-neutral-light"
        >
          Today
        </button>
        <button type="button" aria-label="Next window" onClick={onNext} className={navButtonClass}>
          <ChevronRightIcon size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
};
