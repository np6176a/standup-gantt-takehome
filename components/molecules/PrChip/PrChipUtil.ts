// Pure helpers for the PrChip: its timeline interval (firstCommit → merged/closed/now),
// its review-state dot, and the small display bits. A PR chip is a thin bar nested under
// its resolved issue on the same timeline scale, so its geometry reuses the shared
// `barMetrics`; this module only turns a normalized PullRequest into scale/display inputs.

import type { PullRequest } from '@/lib/normalize/pullRequests';
import type { Interval } from '@/lib/gantt/layout';
import { dayIndexFromDateString } from '@/lib/gantt/scale';

/** A PR's review-state signal, in escalation order for the dot. */
export type ReviewDotState = 'changes' | 'pending' | 'approved' | 'none';

/** The color class + label for each review state. The icon is rendered by the component. */
export interface ReviewDot {
  className: string;
  label: string;
}

/** Review-state dot presentation keyed by state. */
export const REVIEW_DOT: Record<ReviewDotState, ReviewDot> = {
  changes: { className: 'text-attention-blocked', label: 'changes requested' },
  pending: { className: 'text-content-muted', label: 'review pending' },
  approved: { className: 'text-status-done', label: 'approved' },
  none: { className: 'text-content-muted', label: 'no review' },
};

/**
 * A PR's effective review-state dot: changes-requested outranks a still-pending request,
 * which outranks an approval, else none. Mirrors the escalation the chip should shout.
 */
export function reviewDotState(pr: PullRequest): ReviewDotState {
  if (pr.hasChangesRequested) return 'changes';
  if (pr.reviewOutcomes.some((outcome) => outcome.status === 'pending')) return 'pending';
  const approved = pr.reviewOutcomes.some(
    (outcome) => outcome.status === 'completed' && outcome.reviewState === 'APPROVED',
  );
  return approved ? 'approved' : 'none';
}

/**
 * The chip's timeline interval in day indices: from the PR's first commit to its merge,
 * else its close, else today (an open PR runs to "now"). Returns null when the PR has no
 * start anchor at all. `end` is clamped to be ≥ `start` so a same-day PR still has a
 * concrete, non-reversed span.
 */
export function prChipInterval(pr: PullRequest, todayIdx: number): Interval | null {
  const startIso = pr.firstCommitAt ?? pr.createdAt;
  if (!startIso) return null;
  const start = dayIndexFromDateString(startIso);
  const endIso = pr.mergedAt ?? pr.closedAt;
  const endDay = endIso ? dayIndexFromDateString(endIso) : todayIdx;
  return { start, end: Math.max(endDay + 1, start + 1) };
}

/** The chip's short label — the PR number. */
export function prChipLabel(pr: PullRequest): string {
  return `#${pr.number}`;
}

/** Accessible label naming the PR, its state, and its review status. */
export function prChipAriaLabel(pr: PullRequest): string {
  return `PR #${pr.number} ${pr.title} — ${pr.state.toLowerCase()}, ${REVIEW_DOT[reviewDotState(pr)].label}`;
}
