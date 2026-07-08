// Pure helpers for the IssueBar: bucket → color treatment, label text/visibility,
// and the accessible label. Bars use MUTED hue-tint fills (Linear-style) with a thin
// saturated left edge as the hue cue; text is the theme's normal content color. The
// saturated status token survives only in that edge and in the due-only page-card marker.
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
  /** Border + text color for the due-only page-card marker (the saturated bucket hue). */
  markerCardClass: string;
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
    markerCardClass: 'border-status-active text-status-active',
    ghost: false,
  },
  review: {
    barClass: 'bg-status-review-muted text-content border-l-2 border-status-review',
    markerCardClass: 'border-status-review text-status-review',
    ghost: false,
  },
  shipping: {
    barClass: 'bg-status-shipping-muted text-content border-l-2 border-status-shipping',
    markerCardClass: 'border-status-shipping text-status-shipping',
    ghost: false,
  },
  done: {
    barClass: 'bg-status-done-muted text-content-secondary border-l-2 border-status-done',
    markerCardClass: 'border-status-done text-status-done',
    ghost: false,
  },
  planned: {
    barClass: 'border border-status-planned bg-surface-raised text-content-secondary',
    markerCardClass: 'border-status-planned text-status-planned',
    ghost: true,
  },
  triage: {
    barClass: 'bg-status-triage-muted text-content border-l-2 border-status-triage',
    markerCardClass: 'border-status-triage text-status-triage',
    ghost: false,
  },
  dropped: {
    barClass: 'border border-dashed border-status-dropped bg-surface-raised text-content-muted line-through',
    markerCardClass: 'border-status-dropped text-status-dropped',
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

/**
 * The focus ring class for the due-only page-card marker in its attention state. Only
 * blocked carries a ring — overdue is a quiet signal shown by its day-count badge alone.
 */
export function attentionRingClass(attention: DerivedAttention): string {
  if (attention.blockedDerived) return 'ring-2 ring-attention-blocked';
  return '';
}

/**
 * The blocked outline for a full bar: a red edge on the top, right, and bottom only —
 * open on the left so the bar's leading (bucket-hue) edge stays clean. Implemented as
 * inset box-shadows (no layout shift, follows the bar's rounded corners). Overdue and
 * clear bars get no outline (overdue reads via its day-count badge).
 */
export function barBlockedOutlineClass(attention: DerivedAttention): string {
  if (!attention.blockedDerived) return '';
  return 'shadow-[inset_0_2px_0_0_var(--color-attention-blocked),inset_0_-2px_0_0_var(--color-attention-blocked),inset_-2px_0_0_0_var(--color-attention-blocked)]';
}

/** True when either attention overlay applies (bar carries a red treatment). */
export function hasAttention(attention: DerivedAttention): boolean {
  return attention.blockedDerived || attention.overdue;
}

/**
 * Border + text color for the due-only page-card marker: red under attention (blocked
 * outranks overdue), otherwise the bucket's saturated hue. Unlike full bars, a marker has
 * no room for the overdue day-count badge, so overdue keeps a marker-specific red treatment
 * here — otherwise a past-due marker would look identical to an on-track one.
 */
export function markerCardColorClass(attention: DerivedAttention, bucketCardClass: string): string {
  if (attention.blockedDerived) return 'border-attention-blocked text-attention-blocked';
  if (attention.overdue) return 'border-attention-overdue text-attention-overdue';
  return bucketCardClass;
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
