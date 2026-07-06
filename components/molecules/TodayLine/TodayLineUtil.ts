import { MONTH_SHORT, dateFromDayIndex } from '@/lib/gantt/scale';

/**
 * Format a day index as a short "Mon Day" label (e.g. `Jul 6`), using the same
 * UTC-anchored month/day the header ticks use so the today marker reads the same
 * calendar day as the columns beneath it.
 */
export function formatDayLabel(idx: number): string {
  const date = dateFromDayIndex(idx);
  return `${MONTH_SHORT[date.getUTCMonth()]} ${date.getUTCDate()}`;
}
