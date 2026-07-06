// Review pairing: turn a PR's review submissions + review-request timeline into one
// outcome per roster reviewer. This is the subtlest normalization — a "pending
// review" is not a review node at all, it's an unanswered ReviewRequestedEvent, and
// requests can be removed and re-requested, mooting an earlier submission.
//
// Per reviewer (bots/outsiders filtered out up front):
//   1. Replay their REQUESTED/REMOVED events in time order — the last one wins, so a
//      remove→re-request leaves an OPEN request dated at the re-request.
//   2. A submission at/after that open request answers it → completed; with no answering
//      submission → mooted if the PR is closed/merged, else pending.
//   3. No open request but a submission exists → a drive-by review → completed.
//   4. No open request and no submission → not a reviewer here (dropped).
//
// Separately, `reviewState` carries the reviewer's STANDING verdict — their latest
// decisive review (APPROVED/CHANGES_REQUESTED/DISMISSED, ignoring bare comments) across
// all submissions. It persists across a re-request, matching GitHub: a changes-requested
// keeps blocking until the reviewer approves or is dismissed, even while they show as
// pending on a fresh request. That standing verdict, not the request status, drives
// blocked-derivation.

import type { GithubReviewState, WirePullRequestNode } from '@/lib/domain/wire';
import type { Person } from '@/lib/domain/types';
import { personByLogin } from '@/lib/domain/roster';

/** Where a requested review ended up. */
export type ReviewStatus = 'pending' | 'completed' | 'mooted';

/** One reviewer's resolved relationship to a PR. */
export interface ReviewOutcome {
  reviewer: Person;
  status: ReviewStatus;
  /** ISO time of the effective (final) review request, or null for a drive-by. */
  requestedAt: string | null;
  /** ISO time of the answering submission, or null when unanswered. */
  respondedAt: string | null;
  /**
   * The reviewer's standing verdict: their latest DECISIVE review (APPROVED /
   * CHANGES_REQUESTED / DISMISSED, ignoring bare comments), or null if they never gave
   * one. Persists across a re-request, so a prior CHANGES_REQUESTED keeps blocking even
   * while `status` is `pending`.
   */
  reviewState: GithubReviewState | null;
}

const sameLogin = (a: string | undefined, b: string): boolean =>
  a?.toLowerCase() === b.toLowerCase();

/** Epoch millis of an ISO timestamp — compare instants numerically, never by string
 *  (lexicographic compare only holds for identical UTC formatting). */
const epoch = (iso: string): number => new Date(iso).getTime();

const byTimeAsc = (a: string, b: string): number => epoch(a) - epoch(b);

/** Last element (or undefined) — `Array.prototype.at` is ES2022, this repo targets ES2020. */
const last = <T>(items: readonly T[]): T | undefined => items[items.length - 1];

/**
 * Review states that constitute a decision on the PR. A bare COMMENTED review does
 * NOT change a reviewer's verdict — GitHub keeps an earlier CHANGES_REQUESTED blocking
 * until the same reviewer approves or dismisses — so the effective verdict is the
 * latest DECISIVE review, and a trailing comment never clears a changes-requested.
 */
const DECISIVE_STATES: ReadonlySet<GithubReviewState> = new Set([
  'APPROVED',
  'CHANGES_REQUESTED',
  'DISMISSED',
]);

/** Collect the roster logins that either were requested to review or did review. */
function reviewerLogins(node: WirePullRequestNode): string[] {
  const logins = new Set<string>();
  for (const event of node.timelineItems.nodes) {
    const login = event.requestedReviewer?.login;
    if (login && personByLogin(login)) logins.add(login);
  }
  for (const review of node.reviews.nodes) {
    const login = review.author?.login;
    if (login && review.state !== 'PENDING' && personByLogin(login)) logins.add(login);
  }
  return [...logins];
}

/**
 * Resolve every roster reviewer's outcome for a PR. Bots and outside contributors
 * are filtered (they never resolve to a Person), so `orbit-ci-bot` produces nothing.
 */
export function pairReviews(node: WirePullRequestNode): ReviewOutcome[] {
  const prClosed = node.state !== 'OPEN';

  return reviewerLogins(node).flatMap((login): ReviewOutcome[] => {
    const reviewer = personByLogin(login);
    if (!reviewer) return [];

    const events = node.timelineItems.nodes
      .filter((event) => sameLogin(event.requestedReviewer?.login, login))
      .slice()
      .sort((a, b) => byTimeAsc(a.createdAt, b.createdAt));
    const lastEvent = last(events);
    const openRequestAt =
      lastEvent?.__typename === 'ReviewRequestedEvent' ? lastEvent.createdAt : null;

    const submissions = node.reviews.nodes
      .filter(
        (review) =>
          sameLogin(review.author?.login, login) &&
          review.state !== 'PENDING' &&
          review.submittedAt != null,
      )
      .slice()
      .sort((a, b) => byTimeAsc(a.submittedAt!, b.submittedAt!));

    // The reviewer's STANDING verdict: their latest DECISIVE review across ALL
    // submissions, regardless of the request window. GitHub keeps a CHANGES_REQUESTED
    // blocking until that same reviewer approves or is dismissed — even across a
    // remove→re-request — so this (not the answering submission) is what reviewState
    // reports and what drives blocked-derivation. A trailing COMMENTED is not decisive,
    // so it never clears an earlier changes-requested.
    const standingVerdict = last(submissions.filter((r) => DECISIVE_STATES.has(r.state)))?.state ?? null;

    // Whether the reviewer answered the CURRENT open request (drives status + respondedAt).
    // Using >= (not >) so a seed request and its same-instant submission still pair; only
    // a submission that clearly PRE-dates a re-request leaves them pending. No open
    // request → any submission is a drive-by review.
    const answeringSubmissions = openRequestAt
      ? submissions.filter((review) => epoch(review.submittedAt!) >= epoch(openRequestAt))
      : submissions;
    const engaged = last(answeringSubmissions) ?? null;

    if (openRequestAt) {
      return [{
        reviewer,
        status: engaged ? 'completed' : prClosed ? 'mooted' : 'pending',
        requestedAt: openRequestAt,
        respondedAt: engaged?.submittedAt ?? null,
        // Standing verdict persists even while pending (re-requested): a prior
        // changes-requested keeps blocking until the reviewer approves/dismisses.
        reviewState: standingVerdict,
      }];
    }

    // No open request: a submission is a drive-by review (completed); nothing → drop.
    if (engaged) {
      return [{
        reviewer,
        status: 'completed' as const,
        requestedAt: null,
        respondedAt: engaged.submittedAt,
        reviewState: standingVerdict,
      }];
    }
    return [];
  });
}

/**
 * True when any reviewer's standing verdict is CHANGES_REQUESTED. This holds regardless
 * of request status: a reviewer re-requested after asking for changes is `pending`, but
 * their changes-requested still blocks the PR until they approve or it's dismissed
 * (GitHub's semantics), so `reviewState` — the standing verdict — is what we check.
 */
export function hasChangesRequested(outcomes: readonly ReviewOutcome[]): boolean {
  return outcomes.some((outcome) => outcome.reviewState === 'CHANGES_REQUESTED');
}
