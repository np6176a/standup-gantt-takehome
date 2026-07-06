// Greedy interval packing: fit a lane's bars into as few stacked rows as possible
// without overlaps, so a swimlane is compact but never draws two bars on top of
// each other. Pure and framework-free; the caller supplies items already ordered by
// priority (blocked/overdue first, then bucket) and packing preserves that order.

/** A half-open day-index span `[start, end)`. Touching spans (a.end === b.start) share a row. */
export interface Interval {
  start: number;
  end: number;
}

/** Two half-open spans overlap unless one ends at or before the other begins. */
function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Pack items into rows so no two items in a row overlap. Items are placed in caller
 * order (not re-sorted), so higher-priority items claim their rows first and land in
 * the earliest rows. Each item joins the first row where it overlaps NOTHING already
 * placed — so it can slot into a gap before existing items, not only after the row's
 * rightmost edge. That keeps dense lanes compact regardless of caller order (a
 * priority order isn't chronological). A lower-priority item may fill a gap in an
 * upper row, which is fine: row assignment still favours higher-priority items, and
 * a bar's horizontal position comes from its own span, not its index in the row.
 *
 * @param items ordered items to place
 * @param getInterval extracts each item's `[start, end)` day-index span
 * @returns rows of items, top row first
 */
export function packLanes<T>(
  items: readonly T[],
  getInterval: (item: T) => Interval,
): T[][] {
  const rows: Array<Array<{ item: T; span: Interval }>> = [];

  for (const item of items) {
    const span = getInterval(item);
    const openRow = rows.find((row) => row.every((placed) => !overlaps(span, placed.span)));
    if (openRow) {
      openRow.push({ item, span });
    } else {
      rows.push([{ item, span }]);
    }
  }

  return rows.map((row) => row.map((placed) => placed.item));
}
