// Greedy interval packing: fit a lane's bars into as few stacked rows as possible
// without overlaps, so a swimlane is compact but never draws two bars on top of
// each other. Pure and framework-free; the caller supplies items already ordered by
// priority (blocked/overdue first, then bucket) and packing preserves that order.

/** A half-open day-index span `[start, end)`. Touching spans (a.end === b.start) share a row. */
export interface Interval {
  start: number;
  end: number;
}

/**
 * Pack items into rows so no two items in a row overlap. First-fit in the given
 * order: each item joins the first row whose current right edge is at or before the
 * item's start, else it opens a new row. Because items are consumed in caller order
 * (not re-sorted), higher-priority items land in earlier rows.
 *
 * @param items ordered items to place
 * @param getInterval extracts each item's `[start, end)` day-index span
 * @returns rows of items, top row first
 */
export function packLanes<T>(
  items: readonly T[],
  getInterval: (item: T) => Interval,
): T[][] {
  const rows: Array<{ end: number; items: T[] }> = [];

  for (const item of items) {
    const { start, end } = getInterval(item);
    const openRow = rows.find((row) => start >= row.end);
    if (openRow) {
      openRow.items.push(item);
      openRow.end = Math.max(openRow.end, end);
    } else {
      rows.push({ end, items: [item] });
    }
  }

  return rows.map((row) => row.items);
}
