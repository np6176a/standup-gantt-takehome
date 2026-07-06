// Attention derivation: the overdue and (derived) blocked signals the board makes
// loud. Both are app-owned — Linear has no "Blocked" state and no "overdue" flag, so
// they're computed here. The manual "mark blocked" flag lives in planningStore and
// is merged with this derived result at the store level.
//
//   overdue  = dueDate is before today AND the issue isn't Done/Canceled.
//   blocked  = an OPEN PR on the issue has outstanding CHANGES_REQUESTED, OR an
//              In Review issue's pending review request has gone stale (> 2 days).

import type { Bucket } from '@/lib/domain/states';
import type { Issue } from '@/lib/domain/types';
import type { PullRequest } from '@/lib/normalize/pullRequests';
import { DAY_MS, dayIndex, dayIndexFromDateString } from '@/lib/gantt/scale';

/** Age (in days) beyond which a still-pending review request counts as stale. */
export const STALE_REVIEW_DAYS = 2;

/** The derived attention signals for one issue (before merging the manual flag). */
export interface DerivedAttention {
  overdue: boolean;
  blockedDerived: boolean;
  /** Why it's derived-blocked (e.g. "changes requested on #503"), or null. */
  blockedReason: string | null;
}

/** True when the due date is before today and the issue is not Done/Canceled. */
export function isOverdue(dueDate: string | null, bucket: Bucket, today: Date): boolean {
  if (!dueDate) return false;
  if (bucket === 'done' || bucket === 'dropped') return false;
  return dayIndexFromDateString(dueDate) < dayIndex(today);
}

/** Age of an ISO timestamp in whole/fractional days relative to `now`. */
function ageInDays(iso: string, now: Date): number {
  return (now.getTime() - new Date(iso).getTime()) / DAY_MS;
}

/**
 * Derive whether an issue is blocked, and why. First signal: any OPEN PR on the
 * issue with outstanding changes requested. Second signal (In Review issues only): a
 * still-pending review request older than {@link STALE_REVIEW_DAYS}.
 */
export function derivedBlocked(
  issue: Issue,
  prsForIssue: readonly PullRequest[],
  now: Date,
): { blocked: boolean; reason: string | null } {
  const changesRequested = prsForIssue.find(
    (pr) => pr.state === 'OPEN' && pr.hasChangesRequested,
  );
  if (changesRequested) {
    return { blocked: true, reason: `changes requested on #${changesRequested.number}` };
  }

  if (issue.stateName === 'In Review') {
    const stale = prsForIssue.some(
      (pr) =>
        pr.state === 'OPEN' &&
        pr.reviewOutcomes.some(
          (outcome) =>
            outcome.status === 'pending' &&
            outcome.requestedAt != null &&
            ageInDays(outcome.requestedAt, now) > STALE_REVIEW_DAYS,
        ),
    );
    if (stale) {
      return { blocked: true, reason: `review request pending > ${STALE_REVIEW_DAYS} days` };
    }
  }

  return { blocked: false, reason: null };
}

/** Combine overdue + derived-blocked for an issue (manual flag merged at store level). */
export function deriveAttention(
  issue: Issue,
  prsForIssue: readonly PullRequest[],
  now: Date,
): DerivedAttention {
  const blocked = derivedBlocked(issue, prsForIssue, now);
  return {
    overdue: isOverdue(issue.dueDate, issue.bucket, now),
    blockedDerived: blocked.blocked,
    blockedReason: blocked.reason,
  };
}
