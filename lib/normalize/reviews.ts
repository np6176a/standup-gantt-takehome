// Review pairing: turn a PR's review submissions + review-request timeline into one
// outcome per roster reviewer. This is the subtlest normalization — a "pending
// review" is not a review node at all, it's an unanswered ReviewRequestedEvent, and
// requests can be removed and re-requested, mooting an earlier submission.
//
// Per reviewer (bots/outsiders filtered out up front):
//   1. Replay their REQUESTED/REMOVED events in time order — the last one wins, so a
//      remove→re-request leaves an OPEN request dated at the re-request.
//   2. A submission at/after that open request answers it → completed (its state is
//      carried, so CHANGES_REQUESTED stays visible to blocked-derivation).
//   3. An open request with no answering submission → mooted if the PR is closed/
//      merged, else pending.
//   4. No open request but a submission exists → a drive-by review → completed.
//   5. No open request and no submission → not a reviewer here (dropped).

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
  /** The submitted review state (e.g. CHANGES_REQUESTED), or null when unanswered. */
  reviewState: GithubReviewState | null;
}

const sameLogin = (a: string | undefined, b: string): boolean =>
  a?.toLowerCase() === b.toLowerCase();

const byTimeAsc = (a: string, b: string): number => a.localeCompare(b);

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
    const lastEvent = events.at(-1);
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

    // A submission at/after the open request answers it. Using >= (not >) so a seed
    // request and its same-instant submission still pair (real submits follow the
    // request; only a submission that clearly PRE-dates a re-request stays pending).
    const answering = openRequestAt
      ? submissions.filter((review) => review.submittedAt! >= openRequestAt).at(-1) ?? null
      : submissions.at(-1) ?? null;

    if (openRequestAt) {
      if (answering) {
        return [{
          reviewer,
          status: 'completed' as const,
          requestedAt: openRequestAt,
          respondedAt: answering.submittedAt,
          reviewState: answering.state,
        }];
      }
      return [{
        reviewer,
        status: prClosed ? ('mooted' as const) : ('pending' as const),
        requestedAt: openRequestAt,
        respondedAt: null,
        reviewState: null,
      }];
    }

    // No open request: a submission is a drive-by review (completed); nothing → drop.
    if (answering) {
      return [{
        reviewer,
        status: 'completed' as const,
        requestedAt: null,
        respondedAt: answering.submittedAt,
        reviewState: answering.state,
      }];
    }
    return [];
  });
}

/**
 * True when the PR's effective review verdict includes an outstanding
 * changes-requested — a completed review whose state is CHANGES_REQUESTED. A
 * reviewer who was re-requested after asking for changes is `pending`, not
 * `completed`, so this correctly stops counting them once the author re-requests.
 */
export function hasChangesRequested(outcomes: readonly ReviewOutcome[]): boolean {
  return outcomes.some(
    (outcome) => outcome.status === 'completed' && outcome.reviewState === 'CHANGES_REQUESTED',
  );
}
