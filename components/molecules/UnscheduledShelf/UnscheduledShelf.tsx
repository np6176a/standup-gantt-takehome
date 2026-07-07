import React from 'react';

import type { Issue } from '@/lib/domain/types';
import { BUCKET_DOT_CLASS } from '@/components/molecules/UnscheduledShelf/UnscheduledShelfUtil';

export interface UnscheduledShelfProps extends React.HTMLAttributes<HTMLDivElement> {
  /** No-date issues for this lane (no start and no due date, so they have no bar). */
  issues: readonly Issue[];
  /** Opens an issue's detail (where its dates can be set). */
  onSelectIssue?: (issueId: string) => void;
  /**
   * Where the sticky chips pin as the timeline scrolls, in pixels from the scroll
   * container's left edge. Defaults to 0; pass the lane-rail width so the chips park
   * at the rail's right edge instead of sliding underneath the sticky rail.
   */
  stickyLeftPx?: number;
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * A compact strip of chips for a lane's unscheduled issues — work that has neither a
 * start nor a due date, so it can't sit on the timeline but must stay visible and
 * selectable (scheduling happens in the detail popover). The chips stay pinned to the
 * left as the timeline scrolls. Renders nothing when the lane has no such issues.
 */
export const UnscheduledShelf = ({
  issues,
  onSelectIssue,
  stickyLeftPx = 0,
  className = '',
  ...props
}: UnscheduledShelfProps) => {
  if (issues.length === 0) return null;

  return (
    <div className={`flex h-full items-center ${className}`} {...props}>
      <div
        className="sticky flex max-w-full items-center gap-2 overflow-x-auto bg-surface px-3 py-1"
        style={{ left: stickyLeftPx }}
      >
        <span className="shrink-0 text-[0.6875rem] font-[var(--font-weight-semibold)] uppercase tracking-[0.03em] text-content-muted">
          Unscheduled
        </span>
        {issues.map((issue) => {
          const chipLabel = `${issue.identifier}: ${issue.title} — ${issue.stateName}`;
          const chipClass = `inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface-raised px-2 py-1 text-[0.75rem] text-content ${onSelectIssue ? 'transition-colors hover:bg-neutral-light' : ''}`;
          const chipContent = (
            <>
              <span
                aria-hidden
                className={`h-2 w-2 shrink-0 rounded-full ${BUCKET_DOT_CLASS[issue.bucket]}`}
              />
              <span className="font-[var(--font-weight-semibold)]">{issue.identifier}</span>
              <span className="text-content-muted">{issue.stateName}</span>
            </>
          );

          return onSelectIssue ? (
            <button
              key={issue.id}
              type="button"
              title={chipLabel}
              aria-label={chipLabel}
              onClick={() => onSelectIssue(issue.id)}
              className={chipClass}
            >
              {chipContent}
            </button>
          ) : (
            <div key={issue.id} title={chipLabel} aria-label={chipLabel} className={chipClass}>
              {chipContent}
            </div>
          );
        })}
      </div>
    </div>
  );
};
