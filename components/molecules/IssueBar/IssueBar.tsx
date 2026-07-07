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
  /** PR chip elements rendered as a second row inside the bar. */
  children?: React.ReactNode;
  /** Optional className for styling overrides. */
  className?: string;
}

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
  children,
  className = '',
}: IssueBarProps) => {
  const treatment = BUCKET_TREATMENT[issue.bucket];
  const overdueDays = daysOverdue(issue.dueDate, todayIdx);
  const ariaLabel = `${barAriaLabel(issue)}${attentionAriaSuffix(attention, overdueDays)}`;
  const ringClass = attentionRingClass(attention);
  const hasChildren = Boolean(children);

  if (isMarker) {
    return (
      <div
        title={ariaLabel}
        aria-label={ariaLabel}
        onClick={() => onSelect?.(issue.id)}
        className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] ${markerAttentionFill(attention, treatment.markerClass)} ${ringClass} ${onSelect ? 'cursor-pointer' : ''} ${className}`}
        style={{ left: `${leftPct}%` }}
      />
    );
  }

  const showLabel = labelVisible(zoom, barWidthPx);
  const cornerClass = `${clippedLeft ? 'rounded-l-none' : 'rounded-l-md'} ${
    clippedRight ? 'rounded-r-none' : 'rounded-r-md'
  }`;

  return (
    <div
      title={ariaLabel}
      aria-label={ariaLabel}
      onClick={() => onSelect?.(issue.id)}
      className={`absolute inset-y-1 flex flex-col overflow-hidden text-left text-[0.75rem] ${zoom !== 'year' ? 'min-w-[0.5rem]' : ''} ${cornerClass} ${treatment.barClass} ${ringClass} ${onSelect ? 'cursor-pointer' : ''} ${className}`}
      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
    >
      <div className={`flex items-center gap-1.5 px-1.5 ${hasChildren ? 'border-b border-white/20 py-0.5' : 'py-0'}`} style={{ minHeight: hasChildren ? undefined : '100%' }}>
        {attention.blockedDerived && (
          <span aria-hidden className="shrink-0 leading-none">
            <BlockedIcon size={14} />
          </span>
        )}

        {showLabel && (
          <span className="truncate font-[var(--font-weight-semibold)]">{barLabelText(issue)}</span>
        )}

        <span className="ml-auto flex shrink-0 items-center gap-1">
          {attention.overdue && overdueDays > 0 && (
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
      </div>

      {hasChildren && (
        <div className="flex flex-col gap-px px-1.5 py-0.5 text-[0.625rem]">
          {children}
        </div>
      )}
    </div>
  );
};
