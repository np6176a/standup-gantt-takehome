import React from 'react';

import type { Issue } from '@/lib/domain/types';
import type { Zoom } from '@/lib/gantt/scale';
import {
  BUCKET_TREATMENT,
  barAriaLabel,
  barLabelText,
  labelVisible,
} from '@/components/molecules/IssueBar/IssueBarUtil';

export interface IssueBarProps {
  /** The issue this bar represents (raw state stays visible on the bar). */
  issue: Issue;
  /** Left edge within the window, as a percentage. */
  leftPct: number;
  /** Bar width as a percentage (0 for a due-only marker). */
  widthPct: number;
  /** Bar width in pixels — decides whether the inline label fits at this zoom. */
  barWidthPx: number;
  /** True for a due-only issue: rendered as a diamond marker, not a bar. */
  isMarker: boolean;
  /** Span starts before the window — square off the left edge as a clip cue. */
  clippedLeft: boolean;
  /** Span ends after the window — square off the right edge as a clip cue. */
  clippedRight: boolean;
  /** Active zoom (drives label degradation). */
  zoom: Zoom;
  /** Opens the issue detail (wired in a later milestone). */
  onSelect?: (issueId: string) => void;
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * One issue's bar on the timeline canvas, absolutely positioned by percentage within
 * its row. Carries the raw state label (never collapsed to the bucket), colored by the
 * status bucket. A due-only issue collapses to a diamond marker at its due date. Clipped
 * edges are squared off so a bar running past the window edge reads as continuing.
 */
export const IssueBar = ({
  issue,
  leftPct,
  widthPct,
  barWidthPx,
  isMarker,
  clippedLeft,
  clippedRight,
  zoom,
  onSelect,
  className = '',
}: IssueBarProps) => {
  const treatment = BUCKET_TREATMENT[issue.bucket];
  const ariaLabel = barAriaLabel(issue);

  const interactive = Boolean(onSelect);

  if (isMarker) {
    const markerClass = `absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] ${treatment.markerClass} ${className}`;
    const markerStyle = { left: `${leftPct}%` };

    return interactive ? (
      <button
        type="button"
        title={ariaLabel}
        aria-label={ariaLabel}
        onClick={() => onSelect!(issue.id)}
        className={markerClass}
        style={markerStyle}
      />
    ) : (
      <div title={ariaLabel} aria-label={ariaLabel} className={markerClass} style={markerStyle} />
    );
  }

  const showLabel = labelVisible(zoom, barWidthPx);
  const cornerClass = `${clippedLeft ? 'rounded-l-none' : 'rounded-l-md'} ${
    clippedRight ? 'rounded-r-none' : 'rounded-r-md'
  }`;
  const barClass = `absolute inset-y-1 flex items-center gap-1.5 overflow-hidden px-1.5 text-left text-[0.75rem] ${zoom !== 'year' ? 'min-w-[0.5rem]' : ''} ${cornerClass} ${treatment.barClass} ${className}`;
  const barStyle = { left: `${leftPct}%`, width: `${widthPct}%` };
  const barLabel = showLabel && (
    <>
      <span className="truncate font-[var(--font-weight-semibold)]">{barLabelText(issue)}</span>
      <span className="ml-auto shrink-0 whitespace-nowrap rounded bg-neutral-light px-1 py-px text-[0.625rem] text-content-secondary">
        {issue.stateName}
      </span>
    </>
  );

  return interactive ? (
    <button
      type="button"
      title={ariaLabel}
      aria-label={ariaLabel}
      onClick={() => onSelect!(issue.id)}
      className={barClass}
      style={barStyle}
    >
      {barLabel}
    </button>
  ) : (
    <div title={ariaLabel} aria-label={ariaLabel} className={barClass} style={barStyle}>
      {barLabel}
    </div>
  );
};
