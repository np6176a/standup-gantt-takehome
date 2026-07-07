// Pure helpers for the LaneHeader: the issue-count summary and the attention badge
// cluster. The cluster is the standup-at-a-glance readout — the badges alone let you
// run standup without reading a single bar — so blocked/overdue lead, then the activity
// counts, then reviews-waiting (which is clickable: it opens the "Needs review" panel).

import type { LaneSummary } from '@/lib/gantt/rows';

/** Pluralized issue-count summary for a lane, e.g. "1 issue", "3 issues", "No issues". */
export function laneCountLabel(count: number): string {
  if (count === 0) return 'No issues';
  return `${count} ${count === 1 ? 'issue' : 'issues'}`;
}

/** A badge's semantic tone — drives its color and whether it reads as an attention signal. */
export type BadgeTone = 'blocked' | 'overdue' | 'active' | 'review' | 'reviews';

/** One rendered badge in the lane header cluster. */
export interface LaneBadge {
  /** Stable React key / identity. */
  key: BadgeTone;
  /** The count (always ≥ 1 — zero-count badges are omitted). */
  count: number;
  /** Accessible label / hover title, e.g. "1 blocked". */
  label: string;
  tone: BadgeTone;
  /** True for the reviews badge, which opens the "Needs review" panel on click. */
  interactive: boolean;
}

/** Tailwind classes per badge tone. Attention tones are red; activity tones are muted. */
export const BADGE_TONE_CLASS: Record<BadgeTone, string> = {
  blocked: 'bg-status-triage-muted text-attention-blocked',
  overdue: 'bg-status-triage-muted text-attention-overdue',
  active: 'bg-status-active-muted text-status-active',
  review: 'bg-status-review-muted text-status-review',
  reviews: 'bg-neutral-light text-content-secondary',
};

/** Solid dot color per tone, for the mobile avatar-rail attention readout. */
export const BADGE_DOT_CLASS: Record<BadgeTone, string> = {
  blocked: 'bg-attention-blocked',
  overdue: 'bg-attention-overdue',
  active: 'bg-status-active',
  review: 'bg-status-review',
  reviews: 'bg-neutral-medium',
};

const reviewsLabel = (count: number): string =>
  `${count} review${count === 1 ? '' : 's'} waiting`;

/**
 * The attention signals shown as stacked dots on the mobile avatar rail, where the full
 * badge cluster can't fit. Only the loud standup signals — blocked, overdue, reviews
 * waiting — in priority order and non-zero only, so a glance at the collapsed rail still
 * surfaces who needs attention. Returns an empty array for a quiet lane.
 */
export function attentionDots(summary: LaneSummary): LaneBadge[] {
  const loud: BadgeTone[] = ['blocked', 'overdue', 'reviews'];
  return laneBadges(summary).filter((badge) => loud.includes(badge.tone));
}

/**
 * Build the lane header's badge cluster from its summary. Only non-zero counts appear,
 * in standup-priority order: blocked → overdue → active → in review → reviews waiting.
 * Returns an empty array for a quiet lane (no cluster rendered).
 */
export function laneBadges(summary: LaneSummary): LaneBadge[] {
  const all: LaneBadge[] = [
    { key: 'blocked', count: summary.blocked, label: `${summary.blocked} blocked`, tone: 'blocked', interactive: false },
    { key: 'overdue', count: summary.overdue, label: `${summary.overdue} overdue`, tone: 'overdue', interactive: false },
    { key: 'active', count: summary.active, label: `${summary.active} active`, tone: 'active', interactive: false },
    { key: 'review', count: summary.inReview, label: `${summary.inReview} in review`, tone: 'review', interactive: false },
    { key: 'reviews', count: summary.reviewsWaiting, label: reviewsLabel(summary.reviewsWaiting), tone: 'reviews', interactive: true },
  ];
  return all.filter((badge) => badge.count > 0);
}
