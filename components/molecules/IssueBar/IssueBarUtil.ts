// Pure helpers for the IssueBar: bucket → color treatment, label text/visibility,
// and the accessible label. Colors come from the status design tokens; solid buckets
// carry white text on the fill, "ghost" buckets (planned/dropped) render as outlines.

import type { Bucket } from '@/lib/domain/states';
import type { Issue } from '@/lib/domain/types';
import type { Zoom } from '@/lib/gantt/scale';
import { shouldShowBarLabel } from '@/lib/gantt/density';

/** The visual treatment for a status bucket. */
export interface BucketTreatment {
  /** Container background/border/text classes for the bar. */
  className: string;
  /** True for outline "ghost" buckets (planned/dropped) — no solid fill. */
  ghost: boolean;
}

/**
 * Bar treatment per bucket. Active/Review/Shipping/Done are solid fills with white
 * text; Planned is a neutral outline (the "not started yet" ghost) and Dropped is a
 * dashed, struck-through outline (canceled). Attention overlays (blocked/overdue) are
 * layered on top in a later milestone and do not replace these.
 */
export const BUCKET_TREATMENT: Record<Bucket, BucketTreatment> = {
  active: { className: 'bg-status-active text-white', ghost: false },
  review: { className: 'bg-status-review text-white', ghost: false },
  shipping: { className: 'bg-status-shipping text-white', ghost: false },
  done: { className: 'bg-status-done text-white', ghost: false },
  planned: {
    className: 'border border-status-planned bg-surface-raised text-content-secondary',
    ghost: true,
  },
  dropped: {
    className: 'border border-dashed border-status-dropped bg-surface-raised text-content-muted line-through',
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
