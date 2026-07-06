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
  done: 'bg-status-done-muted border border-status-done',
  dropped: 'bg-surface-raised border border-dashed border-status-dropped',
};

/** The ordered bucket legend: each bucket with its raw states and swatch. */
export function bucketLegend(): LegendEntry[] {
  return (Object.keys(BUCKET_LABELS) as Bucket[]).map((bucket) => ({
    bucket,
    label: BUCKET_LABELS[bucket],
    states: STATES_BY_BUCKET[bucket].join(', '),
    swatchClass: BUCKET_SWATCH[bucket],
  }));
}

/** One attention-key row: its meaning and the swatch/text color. The icon is rendered by the component. */
export interface AttentionKeyEntry {
  key: 'blocked' | 'overdue';
  label: string;
  /** Text-color class for the icon. */
  toneClass: string;
}

/** The attention key: how the loud blocked/overdue overlays read. */
export const ATTENTION_KEY: readonly AttentionKeyEntry[] = [
  { key: 'blocked', label: 'Blocked (changes requested / stale review / manual)', toneClass: 'text-attention-blocked' },
  { key: 'overdue', label: 'Overdue (past due date)', toneClass: 'text-attention-overdue' },
];
