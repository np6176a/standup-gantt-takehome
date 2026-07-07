// Pure helpers for the PrChip: its timeline interval (firstCommit → merged/closed/now),
// its review-state dot, and the small display bits. A PR chip is a thin bar nested under
// its resolved issue on the same timeline scale, so its geometry reuses the shared
// `barMetrics`; this module only turns a normalized PullRequest into scale/display inputs.

import type { PullRequest } from '@/lib/normalize/pullRequests';
import type { ReviewOutcome } from '@/lib/normalize/reviews';
import type { Interval } from '@/lib/gantt/layout';
import { DAY_MS, dayIndexFromDateString } from '@/lib/gantt/scale';

/** A PR's review-state signal, in escalation order for the dot. */
export type ReviewDotState = 'changes' | 'pending' | 'approved' | 'none';

/** The color class + label for each review state. The icon is rendered by the component. */
export interface ReviewDot {
  className: string;
  label: string;
}

/** Review-state dot presentation keyed by state. */
export const REVIEW_DOT: Record<ReviewDotState, ReviewDot> = {
  changes: { className: 'text-attention-blocked', label: 'Changes requested' },
  pending: { className: 'text-content-muted', label: 'Review pending' },
  approved: { className: 'text-status-done', label: 'Approved' },
  none: { className: 'text-content-muted', label: 'No review' },
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

/** Whole days since an ISO timestamp. */
function daysSince(iso: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS);
}

/** The longest-waiting pending review outcome, or null if none. */
function longestPending(outcomes: readonly ReviewOutcome[]): ReviewOutcome | null {
  const pending = outcomes.filter((o) => o.status === 'pending' && o.requestedAt != null);
  if (pending.length === 0) return null;
  return pending.reduce((oldest, o) =>
    new Date(o.requestedAt!).getTime() < new Date(oldest.requestedAt!).getTime() ? o : oldest,
  );
}

/**
 * The review detail label for the PrChip. Rules:
 * - approved → "approved"
 * - changes requested → "changes requested" + days if > 0
 * - pending → "review pending" + days if > 0, and if exactly one pending reviewer
 *   (and no changes requested) show their display name
 * - none → ""
 */
export function reviewDetailLabel(pr: PullRequest, now: Date): string {
  if (pr.state === 'MERGED') return 'Merged';
  const state = reviewDotState(pr);
  if (state === 'approved' || state === 'none') return state === 'approved' ? 'Approved' : '';

  if (state === 'changes') {
    const changesOutcome = pr.reviewOutcomes.find(
      (o) => o.status === 'completed' && o.reviewState === 'CHANGES_REQUESTED' && o.respondedAt,
    );
    if (changesOutcome?.respondedAt) {
      const days = daysSince(changesOutcome.respondedAt, now);
      return days > 0 ? `Changes requested, ${days}d` : 'Changes requested';
    }
    return 'Changes requested';
  }

  const oldest = longestPending(pr.reviewOutcomes);
  if (!oldest?.requestedAt) return 'review pending';

  const days = daysSince(oldest.requestedAt, now);
  const pendingCount = pr.reviewOutcomes.filter((o) => o.status === 'pending').length;
  const daysLabel = days > 0 ? `, ${days}d` : '';

  if (pendingCount === 1 && !pr.hasChangesRequested) {
    return `Review pending ${oldest.reviewer.displayName}${daysLabel}`;
  }
  return `Review pending${daysLabel}`;
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
  return `PR #${pr.number} ${pr.title} | ${pr.state.toLowerCase()}, ${REVIEW_DOT[reviewDotState(pr)].label}`;
}

/** Compact tooltip for a PR inside an issue bar (no issue title, just essentials). */
export function prChipTooltip(pr: PullRequest): string {
  const state = REVIEW_DOT[reviewDotState(pr)].label;
  const author = pr.authorLogin ? ` by ${pr.authorLogin}` : '';
  return `#${pr.number} ${pr.title}${author} | ${state}`;
}

/** Whether this PR's author differs from the issue's assignee. */
export function isExternalAuthor(pr: PullRequest, assigneeLogin: string | null): boolean {
  if (!assigneeLogin || !pr.authorLogin) return false;
  return pr.authorLogin !== assigneeLogin;
}

/** Group PRs: owner's PRs first, then external authors'. Returns [ownerPrs, externalPrs]. */
export function groupPrsByOwnership(
  prs: readonly PullRequest[],
  assigneeLogin: string | null,
): [PullRequest[], PullRequest[]] {
  const owner: PullRequest[] = [];
  const external: PullRequest[] = [];
  for (const pr of prs) {
    if (isExternalAuthor(pr, assigneeLogin)) external.push(pr);
    else owner.push(pr);
  }
  return [owner, external];
}
