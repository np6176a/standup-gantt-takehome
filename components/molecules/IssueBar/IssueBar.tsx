import React from 'react';

import type { Issue } from '@/lib/domain/types';
import type { DerivedAttention } from '@/lib/normalize/attention';
import type { Zoom } from '@/lib/gantt/scale';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { BlockedIcon, OverdueIcon, PageIcon } from '@/components/icons';
import {
  BUCKET_TREATMENT,
  attentionAriaSuffix,
  attentionRingClass,
  barAriaLabel,
  barLabelText,
  daysOverdue,
  labelVisible,
  markerCardColorClass,
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
  /**
   * Show the assignee's avatar leading the bar. On in project grouping (where the lane is a
   * project, not a person) this is how "who owns this" stays visible; off in person mode,
   * where the lane header already identifies the person.
   */
  showAssignee: boolean;
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
  showAssignee = false,
  onSelect,
  children,
  className = '',
}: IssueBarProps) => {
  const treatment = BUCKET_TREATMENT[issue.bucket];
  const overdueDays = daysOverdue(issue.dueDate, todayIdx);
  const ariaLabel = `${barAriaLabel(issue)}${attentionAriaSuffix(attention, overdueDays)}`;
  const ringClass = attentionRingClass(attention);
  const hasChildren = React.Children.count(children) > 0;

  if (isMarker) {
    return (
      <div
        title={ariaLabel}
        aria-label={ariaLabel}
        onClick={() => onSelect?.(issue.id)}
        className={`absolute top-1/2 flex h-[1.125rem] w-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[3px] border bg-surface-raised ${markerCardColorClass(attention, treatment.markerCardClass)} ${ringClass} ${onSelect ? 'cursor-pointer' : ''} ${className}`}
        style={{ left: `${leftPct}%` }}
      >
        <PageIcon size={11} aria-hidden />
      </div>
    );
  }

  const showLabel = labelVisible(zoom, barWidthPx);
  const cornerClass = `${clippedLeft ? 'rounded-l-none' : 'rounded-l-md'} ${
    clippedRight ? 'rounded-r-none' : 'rounded-r-md'
  }`;

  return (
    <div
      title={ariaLabel}
      className={`absolute inset-y-1 flex flex-col overflow-hidden text-left text-[0.75rem] ${zoom !== 'year' ? 'min-w-[0.5rem]' : ''} ${cornerClass} ${treatment.barClass} ${ringClass} ${className}`}
      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
    >
      {/* Only the title row opens the detail popover — the PR-chip band below stays its
          own click target so a chip click never doubles as an issue click. */}
      <div
        aria-label={ariaLabel}
        onClick={() => onSelect?.(issue.id)}
        className={`flex items-center gap-1.5 px-1.5 ${onSelect ? 'cursor-pointer' : ''} ${hasChildren ? 'border-b border-white/20 py-0.5' : 'py-0'}`}
        style={{ minHeight: hasChildren ? undefined : '100%' }}
      >
        {showAssignee && issue.assignee && (
          <Avatar name={issue.assignee.name} size="xs" className="ring-1 ring-white/40" />
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
          {attention.blockedDerived && (
            <span aria-hidden className="flex shrink-0 items-center leading-none text-attention-blocked">
              <BlockedIcon size={14} />
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
