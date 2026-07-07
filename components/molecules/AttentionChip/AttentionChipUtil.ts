// Pure helpers for the toolbar attention chip: the board's blocked + overdue rollup, a
// human summary for the button's accessible label, and whether there's anything to focus.

/** The chip's derived model: the two counts, their total, and a spoken summary. */
export interface AttentionChipModel {
  blocked: number;
  overdue: number;
  total: number;
  /** True when there is at least one blocked or overdue issue on the board. */
  hasAttention: boolean;
  /** Accessible label, e.g. "2 blocked, 1 overdue" or "No blocked or overdue issues". */
  label: string;
}

/** Pluralize `n <word>` (e.g. `1 blocked`, `2 blocked`), no "s" on the count of one. */
function plural(count: number, word: string): string {
  return `${count} ${word}`;
}

/**
 * The button's hover tooltip, describing what a click will do. State-aware: offer to focus
 * when there's something to focus and the filter is off, offer to clear when it's on, and
 * say there's nothing to focus when the board is clear.
 */
export function attentionChipTitle(hasAttention: boolean, active: boolean): string {
  if (!hasAttention) return 'No blocked or overdue issues to focus';
  return active ? 'Show all issues' : 'Focus on blocked and overdue issues';
}

/**
 * Whether the chip's toggle is actionable. There must be something to focus (`hasAttention`)
 * to turn the filter ON — otherwise clicking "All clear" would enable an empty focus that
 * `passesFilters` collapses to a blank board. An already-ON filter stays actionable so the
 * user can always clear it, even after the last attention item is resolved or hidden.
 */
export function canToggleAttention(hasAttention: boolean, active: boolean): boolean {
  return hasAttention || active;
}

/** Build the attention chip's model from the board's blocked / overdue totals. */
export function attentionChipModel(blocked: number, overdue: number): AttentionChipModel {
  const total = blocked + overdue;
  return {
    blocked,
    overdue,
    total,
    hasAttention: total > 0,
    label:
      total === 0
        ? 'No blocked or overdue issues'
        : `${plural(blocked, 'blocked')}, ${plural(overdue, 'overdue')}`,
  };
}
