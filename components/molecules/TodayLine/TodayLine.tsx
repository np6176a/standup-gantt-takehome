import React from 'react';

export interface TodayLineProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Horizontal position of today within the window, as a percentage of its width. */
  leftPct: number;
  /** Whether today falls inside the visible window (hidden when scrolled out of range). */
  visible: boolean;
  /** Marker caption — the current date, e.g. `Jul 6`. */
  label: string;
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * Full-height vertical marker for the current day, overlaid on the timeline canvas. The
 * badge names the date (e.g. `Jul 6`) so the marker reads the same calendar day as the
 * columns beneath it. Purely decorative and non-interactive (`pointer-events-none`) so it
 * never blocks bar clicks; renders nothing when today is outside the window.
 */
export const TodayLine = ({ leftPct, visible, label, className = '', ...props }: TodayLineProps) => {
  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-y-0 z-20 w-px bg-primary ${className}`}
      style={{ left: `${leftPct}%` }}
      {...props}
    >
      <span className="absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-b-md bg-primary px-1.5 py-0.5 text-[0.625rem] font-[var(--font-weight-semibold)] tracking-[0.03em] text-primary-foreground">
        {label}
      </span>
    </div>
  );
};
