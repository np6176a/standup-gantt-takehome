import React from 'react';

import type { Issue } from '@/lib/domain/types';
import type { DerivedAttention } from '@/lib/normalize/attention';
import type { Zoom } from '@/lib/gantt/scale';
import { BlockedIcon, OverdueIcon } from '@/components/icons';
import {
  BUCKET_TREATMENT,
  attentionAriaSuffix,
  attentionRingClass,
  barAriaLabel,
  barLabelText,
  daysOverdue,
  labelVisible,
  markerAttentionFill,
  overdueBadgeText,
  statusTagClass,
  statusTagLabel,
} from '@/components/molecules/IssueBar/IssueBarUtil';

/** No-attention default so the bar renders plainly when callers don't pass flags (stories). */
const NO_ATTENTION: DerivedAttention = {
  overdue: false,
  blockedDerived: false,
  blockedReason: null,
};

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
  /** Derived attention (blocked/overdue); its overlays never degrade with zoom. */
  attention: DerivedAttention;
  /** Today's day index, for the overdue-days badge. */
  todayIdx: number;
  /** Opens the issue detail popover. */
  onSelect?: (issueId: string) => void;
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * One issue's bar on the timeline canvas, absolutely positioned by percentage within
 * its row. Carries the raw state label (never collapsed to the bucket), colored by the
 * status bucket. Blocked and overdue are loud overlays that layer on top and stay visible
 * at every zoom: blocked gets a red ring + thick red left edge + ⛔; overdue gets a red
 * hatch + a clock badge with days overdue. A due-only issue collapses to a diamond marker
 * (recolored red under attention). Clipped edges are squared off so a bar running past the
 * window edge reads as continuing.
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
  attention = NO_ATTENTION,
  todayIdx,
  onSelect,
  className = '',
}: IssueBarProps) => {
  const treatment = BUCKET_TREATMENT[issue.bucket];
  const overdueDays = daysOverdue(issue.dueDate, todayIdx);
  const ariaLabel = `${barAriaLabel(issue)}${attentionAriaSuffix(attention, overdueDays)}`;
  const ringClass = attentionRingClass(attention);

  const interactive = Boolean(onSelect);

  if (isMarker) {
    const markerClass = `absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] ${markerAttentionFill(attention, treatment.markerClass)} ${ringClass} ${className}`;
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
  const barClass = `absolute inset-y-1 flex items-center gap-1.5 overflow-hidden px-1.5 text-left text-[0.75rem] ${zoom !== 'year' ? 'min-w-[0.5rem]' : ''} ${cornerClass} ${treatment.barClass} ${attention.overdue ? 'bg-hatch-overdue' : ''} ${ringClass} ${className}`;
  const barStyle = { left: `${leftPct}%`, width: `${widthPct}%` };
  // Attention overlays (blocked left edge + ⛔, overdue clock badge) always render — they
  // never degrade with zoom — while the title + raw-state tag show only when the bar is
  // wide enough for a label. Shared by the interactive and static variants below.
  const barContent = (
    <>
      {attention.blockedDerived && (
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-attention-blocked" />
      )}
      {attention.blockedDerived && (
        <span aria-hidden className="shrink-0 leading-none">
          <BlockedIcon size={14} />
        </span>
      )}

      {showLabel && (
        <span className="truncate font-[var(--font-weight-semibold)]">{barLabelText(issue)}</span>
      )}

      <span className="ml-auto flex shrink-0 items-center gap-1">
        {attention.overdue && (
          <span className="inline-flex items-center gap-0.5 whitespace-nowrap rounded bg-attention-overdue px-1 py-px text-[0.625rem] font-[var(--font-weight-semibold)] text-white">
            <OverdueIcon size={10} /> {overdueBadgeText(overdueDays)}
          </span>
        )}
        {showLabel && (
          <span className={`whitespace-nowrap rounded px-1 py-px text-[0.625rem] ${statusTagClass(attention)}`}>
            {statusTagLabel(issue, attention)}
          </span>
        )}
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
      {barContent}
    </button>
  ) : (
    <div title={ariaLabel} aria-label={ariaLabel} className={barClass} style={barStyle}>
      {barContent}
    </div>
  );
};
