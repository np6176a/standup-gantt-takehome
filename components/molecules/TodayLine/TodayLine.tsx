import React from 'react';

export interface TodayLineProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Horizontal position of today within the window, as a percentage of its width. */
  leftPct: number;
  /** Whether today falls inside the visible window (hidden when scrolled out of range). */
  visible: boolean;
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * Full-height vertical marker for "today", overlaid on the timeline canvas. Purely
 * decorative and non-interactive (`pointer-events-none`) so it never blocks bar clicks;
 * renders nothing when today is outside the window.
 */
export const TodayLine = ({ leftPct, visible, className = '', ...props }: TodayLineProps) => {
  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-y-0 z-20 w-px bg-primary ${className}`}
      style={{ left: `${leftPct}%` }}
      {...props}
    >
      <span className="absolute -left-[1.375rem] top-0 rounded-b-md bg-primary px-1.5 py-0.5 text-[0.625rem] font-[var(--font-weight-semibold)] uppercase tracking-[0.05em] text-primary-foreground">
        Today
      </span>
    </div>
  );
};
