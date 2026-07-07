'use client';

import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';

import type { PullRequest } from '@/lib/normalize/pullRequests';
import type { ReviewDotState } from '@/components/molecules/PrChip/PrChipUtil';
import { StoreContext } from '@/stores/StoreProvider';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { CloseIcon, XmarkIcon, ClockIcon, CheckIcon, MinusIcon } from '@/components/icons';
import {
  REVIEW_DOT,
  prChipAriaLabel,
  prChipLabel,
  reviewDotState,
} from '@/components/molecules/PrChip/PrChipUtil';
import {
  buildReviewGroups,
  totalWaiting,
} from '@/components/organisms/ReviewAttentionPanel/ReviewAttentionPanelUtil';

const REVIEW_ICON: Record<ReviewDotState, React.ReactNode> = {
  changes: <XmarkIcon size={12} />,
  pending: <ClockIcon size={12} />,
  approved: <CheckIcon size={12} />,
  none: <MinusIcon size={12} />,
};

export interface ReviewAttentionPanelProps {
  /** Opens a PR from a review row (deep-links out to GitHub). */
  onSelectPr?: (pr: PullRequest) => void;
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * The collapsible "Needs review" side panel: still-pending review requests grouped by
 * reviewer and sorted by staleness (the reviews that have waited longest lead). A lane's
 * 👁 badge opens it filtered to that person; the toolbar opens the full list. The same
 * pending-review data drives the lane badges, so the two surfaces never disagree. Each row
 * carries two deep links: the PR id opens the PR on GitHub, and the resolved issue id (when
 * the PR is connected to an issue) opens that issue's detail drawer.
 */
export const ReviewAttentionPanel = observer(
  ({ onSelectPr, className = '' }: ReviewAttentionPanelProps) => {
    const store = useContext(StoreContext);
    if (!store) return null;

    const { ui, data } = store;
    const now = new Date();
    const filterPersonId = ui.reviewPanel.personId;
    const groups = buildReviewGroups(data.pendingReviewsByPersonId, filterPersonId, now);
    // Resolve each PR's issue identifier back to its issue so a review row can deep-link
    // into the detail drawer (which selects by issue id, not by identifier).
    const issueByKey = new Map(data.issues.map((issue) => [issue.identifier, issue]));
    const filterName = filterPersonId
      ? (groups[0]?.person.displayName ?? data.people.find((person) => person.id === filterPersonId)?.displayName)
      : null;

    return (
      <aside
        aria-label="Needs review"
        className={`flex w-72 shrink-0 flex-col border-l border-border bg-surface ${className}`}
      >
        <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <span className="text-[0.9375rem] font-[var(--font-weight-semibold)] text-content">
            Needs review
          </span>
          <span className="rounded bg-neutral-light px-1.5 py-px text-[0.6875rem] text-content-secondary">
            {totalWaiting(groups)}
          </span>
          <button
            type="button"
            aria-label="Close review panel"
            onClick={() => ui.closeReviewPanel()}
            className="ml-auto flex items-center rounded p-1 text-content-muted transition-colors hover:bg-neutral-light hover:text-content"
          >
            <CloseIcon size={14} />
          </button>
        </header>

        {filterName && (
          <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-[0.75rem] text-content-secondary">
            <span className="capitalize">Filtered to {filterName}</span>
            <button
              type="button"
              onClick={() => ui.openReviewPanel(null)}
              className="ml-auto rounded px-1.5 py-0.5 font-[var(--font-weight-semibold)] text-primary transition-colors hover:bg-neutral-light"
            >
              Show all
            </button>
          </div>
        )}

        <div className="min-h-0 grow overflow-auto">
          {groups.length === 0 ? (
            <p className="px-3 py-6 text-center text-[0.8125rem] text-content-muted">
              No reviews waiting 🎉
            </p>
          ) : (
            groups.map((group) => (
              <section key={group.person.id} className="border-b border-border last:border-b-0">
                <div className="flex items-center gap-2 px-3 py-2">
                  <Avatar name={group.person.name} size="sm" />
                  <span className="truncate text-[0.8125rem] font-[var(--font-weight-semibold)] capitalize text-content">
                    {group.person.displayName}
                  </span>
                  <span className="ml-auto text-[0.6875rem] text-content-muted">
                    {group.rows.length}
                  </span>
                </div>

                <ul className="pb-1.5">
                  {group.rows.map((row) => {
                    const { pr } = row.review;
                    const state = reviewDotState(pr);
                    const dot = REVIEW_DOT[state];
                    // The PR resolves to a Linear issue by its identifier (e.g. "ORB-105");
                    // orphan PRs resolve to none, so the issue-id link is conditional.
                    const issue = pr.issueKey ? issueByKey.get(pr.issueKey) ?? null : null;
                    return (
                      <li
                        key={`${pr.repo.owner}/${pr.repo.name}#${pr.number}`}
                        className="flex items-center gap-2 px-3 py-1 hover:bg-neutral-light"
                      >
                        <span aria-hidden className={`flex shrink-0 items-center leading-none ${dot.className}`}>
                          {REVIEW_ICON[state]}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectPr?.(pr)}
                          title={`${prChipAriaLabel(pr)} — open on GitHub`}
                          aria-label={`Open PR ${prChipLabel(pr)} on GitHub`}
                          className="shrink-0 rounded text-[0.75rem] font-[var(--font-weight-semibold)] text-content-secondary underline-offset-2 transition-colors hover:text-content hover:underline"
                        >
                          {prChipLabel(pr)}
                        </button>
                        {issue && (
                          <button
                            type="button"
                            onClick={() => ui.selectIssue(issue.id)}
                            title={`Open issue ${issue.identifier}`}
                            aria-label={`Open issue ${issue.identifier}`}
                            className="shrink-0 rounded bg-neutral-light px-1 py-px text-[0.6875rem] font-[var(--font-weight-semibold)] text-content-secondary transition-colors hover:bg-primary-muted hover:text-content"
                          >
                            {issue.identifier}
                          </button>
                        )}
                        <span className="min-w-0 grow truncate text-[0.75rem] text-content-secondary">
                          {pr.title}
                        </span>
                        <span
                          className={`shrink-0 text-[0.6875rem] ${row.stale ? 'font-[var(--font-weight-semibold)] text-attention-overdue' : 'text-content-muted'}`}
                          title={`requested ${row.ageLabel} ago`}
                        >
                          {row.ageLabel}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </aside>
    );
  },
);
