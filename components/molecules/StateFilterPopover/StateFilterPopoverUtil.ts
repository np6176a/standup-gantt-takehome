// Pure data for the state-filter popover: the 12 raw states grouped by bucket, each paired
// with its live issue count and current visibility, plus a per-bucket rollup. Source of
// truth for the states-per-bucket mapping is `lib/domain/states`; this only joins it with
// the counts (from `dataStore.issueCountByState`) and the toolbar's visibility map.

import type { Bucket } from '@/lib/domain/states';
import { BUCKET_LABELS, STATES_BY_BUCKET } from '@/lib/domain/states';

/** One checkbox row: a raw state, its live issue count, and whether it's shown. */
export interface StateFilterRow {
  name: string;
  count: number;
  visible: boolean;
}

/** A bucket section of the popover: its header, dot color, and its state rows. */
export interface StateFilterGroup {
  bucket: Bucket;
  label: string;
  /** Solid dot class for the bucket header (mirrors the bar/legend bucket color). */
  dotClass: string;
  rows: StateFilterRow[];
  /** Total issues across the bucket's states (the header count). */
  count: number;
  /** True when every state in the bucket is currently visible (drives the group checkbox). */
  allVisible: boolean;
}

/** Solid dot classes per bucket, mirroring the bar fills used elsewhere. */
const BUCKET_DOT: Record<Bucket, string> = {
  active: 'bg-status-active',
  review: 'bg-status-review',
  shipping: 'bg-status-shipping',
  planned: 'bg-status-planned',
  triage: 'bg-status-triage',
  done: 'bg-status-done',
  dropped: 'bg-status-dropped',
};

/** Whether a raw state is shown given the visibility map (missing / true = visible). */
function isVisible(stateName: string, visibleStates: Record<string, boolean>): boolean {
  return visibleStates[stateName] !== false;
}

/**
 * Join the states-per-bucket mapping with live counts and the visibility map into the
 * popover's ordered sections. Every bucket and all 12 raw states are included regardless
 * of count, so the filter is always complete (a state can be turned on before any issue
 * lands in it).
 */
export function buildStateFilterGroups(
  counts: Record<string, number>,
  visibleStates: Record<string, boolean>,
): StateFilterGroup[] {
  return (Object.keys(BUCKET_LABELS) as Bucket[]).map((bucket) => {
    const rows: StateFilterRow[] = STATES_BY_BUCKET[bucket].map((name) => ({
      name,
      count: counts[name] ?? 0,
      visible: isVisible(name, visibleStates),
    }));
    return {
      bucket,
      label: BUCKET_LABELS[bucket],
      dotClass: BUCKET_DOT[bucket],
      rows,
      count: rows.reduce((total, row) => total + row.count, 0),
      allVisible: rows.every((row) => row.visible),
    };
  });
}
