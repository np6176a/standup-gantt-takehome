// Pure helpers for the LaneHeader. The badge cluster (blocked/overdue/review counts)
// arrives in a later milestone; for now the header carries an issue count summary.

/** Pluralized issue-count summary for a lane, e.g. "1 issue", "3 issues", "No issues". */
export function laneCountLabel(count: number): string {
  if (count === 0) return 'No issues';
  return `${count} ${count === 1 ? 'issue' : 'issues'}`;
}
