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
 * issue with outstanding changes requested. Second signal: an OPEN PR with a
 * still-pending review request older than {@link STALE_REVIEW_DAYS}, on any issue that
 * isn't Done/Canceled.
 */
export function derivedBlocked(
  issue: Issue,
  prsForIssue: readonly PullRequest[],
  now: Date,
): { blocked: boolean; reason: string | null } {
  // Finished work is never blocked — a Done/Canceled issue carries no blocked signal.
  // (A merged PR is likewise excluded everywhere below: every signal keys off an OPEN PR,
  // so once its PR merges the issue stops reading as blocked.)
  if (issue.bucket === 'done' || issue.bucket === 'dropped') {
    return { blocked: false, reason: null };
  }

  const changesRequested = prsForIssue.find(
    (pr) => pr.state === 'OPEN' && pr.hasChangesRequested,
  );
  if (changesRequested) {
    return { blocked: true, reason: `changes requested on #${changesRequested.number}` };
  }

  // A stale pending review blocks any still-open issue. We key off the PR being open
  // with a stale request rather than the Linear "In Review" state: that state is
  // automation-owned and can lag the real PR status (e.g. the seed's ORB-129 sits in
  // "In Progress" while PR #531 has a review request pending for over a week), so a
  // state gate would hide exactly the stale review standup needs to see.
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

/** The app-owned "mark blocked" flag from planningStore (blocked + optional reason). */
export interface ManualBlockedFlag {
  blocked: boolean;
  reason?: string;
}

/** Fallback reason shown when an issue is manually blocked with no reason given. */
export const MANUAL_BLOCKED_REASON = 'marked blocked';

/**
 * Merge the app-owned manual "mark blocked" flag into an issue's derived attention:
 * blocked becomes the union of the two sources, so a bar reads blocked whether the signal
 * is derived (changes requested / stale review) or someone flagged it in standup. A
 * derived reason is kept when present (it names the concrete signal); otherwise the
 * manual reason — or a default when none was given — is used. `overdue` is untouched.
 *
 * Finished work is never blocked: a Done/Canceled issue drops the manual flag entirely,
 * matching {@link derivedBlocked} so completed issues stay off the blocked treatment.
 */
export function mergeManualBlocked(
  derived: DerivedAttention,
  manual: ManualBlockedFlag | undefined,
  bucket: Bucket,
): DerivedAttention {
  if (bucket === 'done' || bucket === 'dropped') return derived;
  if (!manual?.blocked) return derived;
  const manualReason = manual.reason?.trim();
  return {
    ...derived,
    blockedDerived: true,
    blockedReason: derived.blockedReason ?? (manualReason || MANUAL_BLOCKED_REASON),
  };
}
