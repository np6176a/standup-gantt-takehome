// The status model: semantic buckets over Linear's 12 raw workflow states.
//
// Buckets drive color, ordering, and badges; the raw state stays visible on every
// bar and in the popover (the hybrid described in the plan). This module is also
// the normalization seam that absorbs unknown/custom state names — real Linear
// workspaces customize states, and fake-Linear accepts free-text state names — so
// `bucketForState` never throws on an unrecognized name.

/** Semantic status bucket. Drives bar color, sort rank, and lane-header badges. */
export type Bucket = 'active' | 'review' | 'shipping' | 'planned' | 'done' | 'dropped';

/** The raw Linear states that make up each bucket (source of truth for the legend). */
export const STATES_BY_BUCKET: Record<Bucket, readonly string[]> = {
  active: ['In Progress', 'Design Exploration'],
  review: ['In Review'],
  shipping: ['On Develop', 'On Staging', 'On Prod'],
  planned: ['Todo', 'Selected For Development', 'Backlog', 'Triage'],
  done: ['Done'],
  dropped: ['Canceled'],
};

/** Human-readable bucket labels for the legend and summaries. */
export const BUCKET_LABELS: Record<Bucket, string> = {
  active: 'Active',
  review: 'In Review',
  shipping: 'Shipping',
  planned: 'Planned',
  done: 'Done',
  dropped: 'Dropped',
};

/** Reverse index: raw state name → bucket, built once from STATES_BY_BUCKET. */
const BUCKET_BY_STATE: Record<string, Bucket> = Object.fromEntries(
  (Object.entries(STATES_BY_BUCKET) as [Bucket, readonly string[]][]).flatMap(
    ([bucket, states]) => states.map((state) => [state, bucket] as const),
  ),
);

/**
 * Map a raw Linear state name to its bucket. Unknown/custom names fall back to
 * `planned` (the ghost/neutral treatment) so a customized workspace still renders.
 */
export function bucketForState(stateName: string): Bucket {
  return BUCKET_BY_STATE[stateName] ?? 'planned';
}

/** All 12 raw states, ordered by bucket then declaration order. */
export const ALL_STATES: readonly string[] = Object.values(STATES_BY_BUCKET).flat();

/**
 * States advanced by the workspace's GitHub automation. They are read-only in the
 * app (shown "set by GitHub automation") — the editor only writes the others.
 */
export const AUTOMATION_OWNED_STATES: ReadonlySet<string> = new Set([
  'In Progress',
  'In Review',
  'On Develop',
  'On Staging',
  'On Prod',
]);

/** True when a state is advanced by automation (and therefore locked in the editor). */
export function isAutomationOwned(stateName: string): boolean {
  return AUTOMATION_OWNED_STATES.has(stateName);
}

/** The 7 states the app may write (everything not automation-owned). */
export const WRITABLE_STATES: readonly string[] = ALL_STATES.filter(
  (state) => !AUTOMATION_OWNED_STATES.has(state),
);

/** State a freshly created issue lands in: queued, pre-start (a writable state). */
export const DEFAULT_CREATE_STATE = 'Selected For Development';

/** States hidden by default in the toolbar state filter (noise for standup). */
export const DEFAULT_HIDDEN_STATES: readonly string[] = ['Backlog', 'Triage', 'Canceled'];

/**
 * Sort rank per bucket for ordering rows within a lane (after blocked/overdue,
 * which are overlay signals handled separately): Active → In Review → Shipping →
 * Planned → Done → Dropped.
 */
export const BUCKET_ORDER: Record<Bucket, number> = {
  active: 0,
  review: 1,
  shipping: 2,
  planned: 3,
  done: 4,
  dropped: 5,
};

/** The sort rank of a bucket (lower sorts first). */
export function bucketRank(bucket: Bucket): number {
  return BUCKET_ORDER[bucket];
}
