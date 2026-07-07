// Pure helpers for the "Needs review" panel: turn the store's still-pending review
// requests (grouped by reviewer person id) into display groups sorted by staleness. Bot,
// outside, and mooted requests are already filtered upstream (only roster reviewers with
// an open request produce a `pending` outcome), so this only shapes + ages what's left.

import type { Person } from '@/lib/domain/types';
import type { PendingReview } from '@/stores/dataStore';
import { STALE_REVIEW_DAYS } from '@/lib/normalize/attention';
import { DAY_MS } from '@/lib/gantt/scale';

/** One pending request row: the review plus its age relative to "now". */
export interface ReviewRow {
  review: PendingReview;
  /** Whole days since the request was made (≥ 0). */
  ageDays: number;
  /** Compact age label, e.g. "today" / "3d". */
  ageLabel: string;
  /** True when the request has gone stale (older than {@link STALE_REVIEW_DAYS}). */
  stale: boolean;
}

/** One reviewer's group of waiting requests, oldest first. */
export interface ReviewGroup {
  person: Person;
  rows: ReviewRow[];
  /** Age of this reviewer's oldest waiting request (drives group ordering). */
  oldestAgeDays: number;
}

/** Whole days between an ISO request time and now (≥ 0); 0 when the time is missing. */
export function reviewRequestAgeDays(requestedAt: string | null, now: Date): number {
  if (!requestedAt) return 0;
  return Math.max(0, Math.floor((now.getTime() - new Date(requestedAt).getTime()) / DAY_MS));
}

/** Compact age label for a request: "today" on day zero, else "{n}d". */
export function reviewAgeLabel(ageDays: number): string {
  return ageDays < 1 ? 'today' : `${ageDays}d`;
}

/** Build one reviewer's row from a pending request, aged against now. */
function toRow(review: PendingReview, now: Date): ReviewRow {
  const ageDays = reviewRequestAgeDays(review.outcome.requestedAt, now);
  return { review, ageDays, ageLabel: reviewAgeLabel(ageDays), stale: ageDays > STALE_REVIEW_DAYS };
}

/**
 * Shape the pending reviews into per-reviewer groups for the panel. Rows within a group
 * sort oldest-request-first, and groups sort by their oldest request (most stale reviewer
 * on top) so the reviews that have waited longest lead. When `filterPersonId` is set (a
 * lane 👁 badge opened the panel filtered to that person), only that reviewer's group
 * survives. Reviewers with no waiting requests never produce a group.
 */
export function buildReviewGroups(
  pendingByPersonId: ReadonlyMap<string, readonly PendingReview[]>,
  filterPersonId: string | null,
  now: Date,
): ReviewGroup[] {
  const groups: ReviewGroup[] = [];
  for (const [personId, reviews] of pendingByPersonId) {
    if (filterPersonId && personId !== filterPersonId) continue;
    if (reviews.length === 0) continue;
    const rows = reviews.map((review) => toRow(review, now)).sort((a, b) => b.ageDays - a.ageDays);
    groups.push({ person: rows[0].review.outcome.reviewer, rows, oldestAgeDays: rows[0].ageDays });
  }
  return groups.sort(
    (a, b) => b.oldestAgeDays - a.oldestAgeDays || a.person.displayName.localeCompare(b.person.displayName),
  );
}

/** Total waiting requests across all (filtered) groups — the panel's headline count. */
export function totalWaiting(groups: readonly ReviewGroup[]): number {
  return groups.reduce((total, group) => total + group.rows.length, 0);
}
