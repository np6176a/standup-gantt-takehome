// Pure helpers for the IssueBar: bucket → color treatment, label text/visibility,
// and the accessible label. Bars use MUTED hue-tint fills (Linear-style) with a thin
// saturated left edge as the hue cue; text is the theme's normal content color. The
// saturated status token survives only in that edge and in the due-only diamond marker.
// "Ghost" buckets (planned/dropped) stay as neutral outlines.

import type { Bucket } from '@/lib/domain/states';
import type { Issue } from '@/lib/domain/types';
import type { DerivedAttention } from '@/lib/normalize/attention';
import type { Zoom } from '@/lib/gantt/scale';
import { dayIndexFromDateString } from '@/lib/gantt/scale';
import { shouldShowBarLabel } from '@/lib/gantt/density';

/** The visual treatment for a status bucket. */
export interface BucketTreatment {
  /** Bar container classes: muted tint fill + thin saturated left edge + text color. */
  barClass: string;
  /** Fill class for the due-only diamond marker (saturated — a small accent reads fine). */
  markerClass: string;
  /** True for outline "ghost" buckets (planned/dropped) — no tint fill. */
  ghost: boolean;
}

/**
 * Bar treatment per bucket. Active/Review/Shipping/Done are low-saturation tint fills
 * with a 2px saturated left edge carrying the hue; Planned is a neutral outline (the
 * "not started yet" ghost) and Dropped is a dashed, struck-through outline (canceled).
 * Attention overlays (blocked/overdue) layer on top in a later milestone.
 */
export const BUCKET_TREATMENT: Record<Bucket, BucketTreatment> = {
  active: {
    barClass: 'bg-status-active-muted text-content border-l-2 border-status-active',
    markerClass: 'bg-status-active',
    ghost: false,
  },
  review: {
    barClass: 'bg-status-review-muted text-content border-l-2 border-status-review',
    markerClass: 'bg-status-review',
    ghost: false,
  },
  shipping: {
    barClass: 'bg-status-shipping-muted text-content border-l-2 border-status-shipping',
    markerClass: 'bg-status-shipping',
    ghost: false,
  },
  done: {
    barClass: 'bg-status-done-muted text-content-secondary border-l-2 border-status-done',
    markerClass: 'bg-status-done',
    ghost: false,
  },
  planned: {
    barClass: 'border border-status-planned bg-surface-raised text-content-secondary',
    markerClass: 'bg-status-planned',
    ghost: true,
  },
  triage: {
    barClass: 'bg-status-triage-muted text-content border-l-2 border-status-triage',
    markerClass: 'bg-status-triage',
    ghost: false,
  },
  dropped: {
    barClass: 'border border-dashed border-status-dropped bg-surface-raised text-content-muted line-through',
    markerClass: 'bg-status-dropped',
    ghost: true,
  },
};

/** The bar's primary inline label: issue id + title (the raw state shows as a tag). */
export function barLabelText(issue: Issue): string {
  return `${issue.identifier} ${issue.title}`;
}

/** Accessible label naming the issue, its title, and its raw (never-collapsed) state. */
export function barAriaLabel(issue: Issue): string {
  return `${issue.identifier}: ${issue.title} | ${issue.stateName}`;
}

/** Whether a bar of this pixel width shows its inline label at this zoom (delegates density). */
export function labelVisible(zoom: Zoom, barWidthPx: number): boolean {
  return shouldShowBarLabel(zoom, barWidthPx);
}

// ── Attention overlays ────────────────────────────────────────────────────────
// Blocked and overdue are the loud, first-class standup signals — they render at EVERY
// zoom (never degraded away) and are visually distinct from each other and from the
// bucket fills. Blocked outranks overdue for the ring color; the overdue hatch + clock
// badge still layer on when an issue is both.

/** The focus ring class for a bar in its attention state (blocked red outranks overdue red). */
export function attentionRingClass(attention: DerivedAttention): string {
  if (attention.blockedDerived) return 'ring-2 ring-attention-blocked';
  if (attention.overdue) return 'ring-1 ring-attention-overdue';
  return '';
}

/** True when either attention overlay applies (bar carries a red treatment). */
export function hasAttention(attention: DerivedAttention): boolean {
  return attention.blockedDerived || attention.overdue;
}

/** Fill class for the due-only diamond marker under attention (blocked/overdue → red). */
export function markerAttentionFill(attention: DerivedAttention, bucketFill: string): string {
  if (attention.blockedDerived) return 'bg-attention-blocked';
  if (attention.overdue) return 'bg-attention-overdue';
  return bucketFill;
}

/**
 * Whole days an issue is past its due date (≥ 1 when overdue, else 0). Uses UTC day
 * indices — the same off-by-one-safe basis as overdue derivation.
 */
export function daysOverdue(dueDate: string | null, todayIdx: number): number {
  if (!dueDate) return 0;
  return Math.max(0, todayIdx - dayIndexFromDateString(dueDate));
}

/** The status tag label: "Blocked" when blocked, else the raw state name. */
export function statusTagLabel(issue: Issue, attention: DerivedAttention): string {
  if (attention.blockedDerived) return 'Blocked';
  return issue.stateName;
}

/** Tailwind classes for the status tag background under attention. */
export function statusTagClass(attention: DerivedAttention): string {
  if (attention.blockedDerived) return 'bg-attention-blocked/20 text-attention-blocked';
  return 'bg-neutral-light text-content-secondary';
}

/** Compact overdue-days label for the red clock badge, e.g. "3d". */
export function overdueBadgeText(days: number): string {
  return `${days}d`;
}

/** Parenthetical attention suffix for the accessible label, e.g. " (blocked — …; overdue by 3 days)". */
export function attentionAriaSuffix(attention: DerivedAttention, days: number): string {
  const parts: string[] = [];
  if (attention.blockedDerived) {
    parts.push(attention.blockedReason ? `blocked | ${attention.blockedReason}` : 'blocked');
  }
  if (attention.overdue) parts.push(`overdue by ${days} day${days === 1 ? '' : 's'}`);
  return parts.length > 0 ? ` (${parts.join('; ')})` : '';
}
