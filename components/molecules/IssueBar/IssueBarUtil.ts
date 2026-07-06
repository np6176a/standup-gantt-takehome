// Pure helpers for the IssueBar: bucket → color treatment, label text/visibility,
// and the accessible label. Bars use MUTED hue-tint fills (Linear-style) with a thin
// saturated left edge as the hue cue; text is the theme's normal content color. The
// saturated status token survives only in that edge and in the due-only diamond marker.
// "Ghost" buckets (planned/dropped) stay as neutral outlines.

import type { Bucket } from '@/lib/domain/states';
import type { Issue } from '@/lib/domain/types';
import type { Zoom } from '@/lib/gantt/scale';
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
  return `${issue.identifier}: ${issue.title} — ${issue.stateName}`;
}

/** Whether a bar of this pixel width shows its inline label at this zoom (delegates density). */
export function labelVisible(zoom: Zoom, barWidthPx: number): boolean {
  return shouldShowBarLabel(zoom, barWidthPx);
}
