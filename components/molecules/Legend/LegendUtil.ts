// Pure data for the Legend: the bucket → raw-states mapping (so the granular states a
// bucket color stands for stay discoverable) and the attention key. Source of truth is
// `lib/domain/states`; this only pairs each bucket with its swatch classes.

import type { Bucket } from '@/lib/domain/states';
import { BUCKET_LABELS, STATES_BY_BUCKET } from '@/lib/domain/states';

/** One bucket row in the legend: its label, the raw states it covers, and its swatch. */
export interface LegendEntry {
  bucket: Bucket;
  label: string;
  /** Comma-joined raw state names the bucket color represents. */
  states: string;
  /** Tailwind classes for the color swatch (matches the IssueBar bucket treatment). */
  swatchClass: string;
}

/** Swatch classes per bucket, mirroring the bar fills (ghost buckets read as outlines). */
const BUCKET_SWATCH: Record<Bucket, string> = {
  active: 'bg-status-active-muted border border-status-active',
  review: 'bg-status-review-muted border border-status-review',
  shipping: 'bg-status-shipping-muted border border-status-shipping',
  planned: 'bg-surface-raised border border-status-planned',
  triage: 'bg-status-triage-muted border border-status-triage',
  done: 'bg-status-done-muted border border-status-done',
  dropped: 'bg-surface-raised border border-dashed border-status-dropped',
};

/**
 * The ordered bucket legend: each bucket with its raw states and swatch.
 * When a bucket contains only one state whose name matches the label, the
 * states string is empty (avoids redundant "Triage  Triage", "Done  Done").
 */
export function bucketLegend(): LegendEntry[] {
  return (Object.keys(BUCKET_LABELS) as Bucket[]).map((bucket) => {
    const raw = STATES_BY_BUCKET[bucket];
    const label = BUCKET_LABELS[bucket];
    const redundant = raw.length === 1 && raw[0] === label;
    return {
      bucket,
      label,
      states: redundant ? '' : raw.join(', '),
      swatchClass: BUCKET_SWATCH[bucket],
    };
  });
}

/** One attention-key row: its meaning and the swatch/text color. The icon is rendered by the component. */
export interface AttentionKeyEntry {
  key: 'blocked' | 'overdue';
  /** Short name rendered in the attention color. */
  name: string;
  /** Parenthetical detail rendered in grey. */
  detail: string;
  /** Text-color class for the icon and name. */
  toneClass: string;
}

/** The attention key: how the loud blocked/overdue overlays read. */
export const ATTENTION_KEY: readonly AttentionKeyEntry[] = [
  { key: 'overdue', name: 'Overdue', detail: 'past due date', toneClass: 'text-attention-overdue' },
  { key: 'blocked', name: 'Blocked', detail: 'changes requested / stale review / manual', toneClass: 'text-attention-blocked' },
];
