// The timeline scale: date ⇄ day index ⇄ x%, plus per-zoom windows and ticks.
//
// EVERYTHING is anchored on UTC day boundaries. Linear returns date-only dueDates
// ("YYYY-MM-DD") and full-ISO timestamps (startedAt, commit dates) side by side;
// mixing them through the local timezone is the #1 off-by-one bug in a Gantt. A
// "day index" is the count of whole UTC days since the Unix epoch, so every date —
// whatever its precision — collapses to the same integer for the same calendar day.

/** Milliseconds in one day. */
export const DAY_MS = 86_400_000;

/** The four zoom levels. Each derives its own window span and tick density. */
export type Zoom = 'week' | 'month' | 'quarter' | 'year';

/** UTC midnight (in ms) of the calendar day containing `date`. */
export function utcDayStartMs(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Absolute day index: whole UTC days since 1970-01-01. */
export function dayIndex(date: Date): number {
  return Math.round(utcDayStartMs(date) / DAY_MS);
}

/**
 * Day index of an ISO date string. Works for both date-only "YYYY-MM-DD" (parsed as
 * UTC midnight per the ISO spec) and full timestamps (collapsed to their UTC day),
 * so a dueDate and a startedAt on the same calendar day yield the same index.
 */
export function dayIndexFromDateString(value: string): number {
  return dayIndex(new Date(value));
}

/** The UTC-midnight Date for a day index (inverse of {@link dayIndex}). */
export function dateFromDayIndex(idx: number): Date {
  return new Date(idx * DAY_MS);
}

/** True when a day index falls on a Saturday or Sunday (UTC), for weekend shading. */
export function isWeekendIndex(idx: number): boolean {
  const weekday = dateFromDayIndex(idx).getUTCDay();
  return weekday === 0 || weekday === 6;
}

/** Days spanned by the visible window at each zoom (drives percentage positioning). */
export const WINDOW_DAYS: Record<Zoom, number> = {
  week: 7,
  month: 35,
  quarter: 91,
  year: 364,
};

/** The window span in days for a zoom. */
export function windowDaysForZoom(zoom: Zoom): number {
  return WINDOW_DAYS[zoom];
}

/** How far before today the window starts, so today sits near the left third. */
export const WINDOW_LEAD_DAYS: Record<Zoom, number> = {
  week: 3,
  month: 7,
  quarter: 14,
  year: 45,
};

/** Default window start (a day index) that frames today for the given zoom. */
export function defaultWindowStart(todayIdx: number, zoom: Zoom): number {
  return todayIdx - WINDOW_LEAD_DAYS[zoom];
}

/** How many days ◀/▶ shifts the window — one "zoom unit". */
export const WINDOW_SHIFT_DAYS: Record<Zoom, number> = {
  week: 7,
  month: 28,
  quarter: 91,
  year: 364,
};

/**
 * Shift the window one zoom unit earlier (-1) or later (+1); direction 0 recenters
 * on today (the "Today" button). Returns the new window start day index.
 */
export function shiftWindow(
  startIdx: number,
  zoom: Zoom,
  direction: -1 | 0 | 1,
  todayIdx: number,
): number {
  if (direction === 0) return defaultWindowStart(todayIdx, zoom);
  return startIdx + direction * WINDOW_SHIFT_DAYS[zoom];
}

/** Horizontal position of a day index within the window, as a percentage (0–100+). */
export function dayIndexToPercent(idx: number, windowStartIdx: number, windowDays: number): number {
  return ((idx - windowStartIdx) / windowDays) * 100;
}

/** Clamp a percentage to the visible [0, 100] range. */
export function clampPercent(percent: number): number {
  return Math.max(0, Math.min(100, percent));
}

/** Geometry for one bar within the window: clamped position + clip/visibility flags. */
export interface BarMetrics {
  /** Left edge as a clamped percentage of the window width. */
  leftPct: number;
  /** Width as a percentage; 0 for a zero-length (marker) span. */
  widthPct: number;
  /** True when the span starts before the window (render a clipped-left affordance). */
  clippedLeft: boolean;
  /** True when the span ends after the window (render a clipped-right affordance). */
  clippedRight: boolean;
  /** True when any part of the span overlaps the window. */
  visible: boolean;
}

/**
 * Compute a bar's clamped placement within a window. Pass the half-open interval from
 * `renderInterval` (NOT `spanInterval`, which is the packing interval): a real bar's
 * exclusive end covers its inclusive last day, while a due-only marker is zero-length
 * (`startIdx === endIdx`) and is drawn as a point that stays visible even on the window's
 * first column. Clamps to the window and reports clipping on either edge (e.g. the
 * long-running ORB-106 that begins weeks before the range).
 */
export function barMetrics(
  startIdx: number,
  endIdx: number,
  windowStartIdx: number,
  windowDays: number,
): BarMetrics {
  const windowEndIdx = windowStartIdx + windowDays;
  const left = clampPercent(dayIndexToPercent(startIdx, windowStartIdx, windowDays));
  const right = clampPercent(dayIndexToPercent(endIdx, windowStartIdx, windowDays));
  // A zero-length span is a marker (a due-only issue): it occupies the single day
  // `startIdx`, so it is visible whenever that day is inside the half-open window
  // [start, end) — including the very first column, where the strict `endIdx >
  // windowStartIdx` overlap test would wrongly hide it. A real bar uses the overlap test.
  const isMarker = startIdx === endIdx;
  const visible = isMarker
    ? startIdx >= windowStartIdx && startIdx < windowEndIdx
    : startIdx < windowEndIdx && endIdx > windowStartIdx;
  return {
    leftPct: left,
    widthPct: Math.max(0, right - left),
    clippedLeft: startIdx < windowStartIdx,
    clippedRight: endIdx > windowEndIdx,
    visible,
  };
}

/** Short month labels for tick generation. */
export const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** One day's worth of header/shading metadata. */
export interface DayColumn {
  idx: number;
  /** UTC weekday, 0 = Sunday … 6 = Saturday. */
  weekday: number;
  dayOfMonth: number;
  isWeekend: boolean;
  /** First of the month — anchors month bands. */
  isMonthStart: boolean;
  /** Monday — anchors week ticks. */
  isWeekStart: boolean;
}

/** A labeled header tick at a day index (week start or month band). */
export interface Tick {
  idx: number;
  label: string;
}

/** Per-day columns for the window, for weekend shading and day-number headers. */
export function dayColumns(startIdx: number, days: number): DayColumn[] {
  return Array.from({ length: days }, (_unused, offset) => {
    const idx = startIdx + offset;
    const date = dateFromDayIndex(idx);
    const weekday = date.getUTCDay();
    const dayOfMonth = date.getUTCDate();
    return {
      idx,
      weekday,
      dayOfMonth,
      isWeekend: weekday === 0 || weekday === 6,
      isMonthStart: dayOfMonth === 1,
      isWeekStart: weekday === 1,
    };
  });
}

/** Week-start (Monday) ticks within the window, labeled "Mon D" (e.g. "Jul 6"). */
export function weekTicks(startIdx: number, days: number): Tick[] {
  return dayColumns(startIdx, days)
    .filter((column) => column.isWeekStart)
    .map((column) => ({
      idx: column.idx,
      label: `${MONTH_SHORT[dateFromDayIndex(column.idx).getUTCMonth()]} ${column.dayOfMonth}`,
    }));
}

/**
 * Month ticks within the window: the first column (partial leading month) plus
 * every month boundary. Consecutive ticks delimit the month bands quarter/year
 * zoom draws.
 */
export function monthTicks(startIdx: number, days: number): Tick[] {
  return dayColumns(startIdx, days)
    .filter((column, position) => position === 0 || column.isMonthStart)
    .map((column) => ({
      idx: column.idx,
      label: MONTH_SHORT[dateFromDayIndex(column.idx).getUTCMonth()],
    }));
}

/** The full tick set for a window; components pick the layers their zoom renders. */
export interface TimelineTicks {
  days: DayColumn[];
  weeks: Tick[];
  months: Tick[];
}

/**
 * Generate every tick layer for a window. Zoom decides which layers render (week:
 * days; month: days + weeks; quarter: weeks + months; year: months) but the pure
 * generation is zoom-independent, so it stays trivially testable.
 */
export function timelineTicks(_zoom: Zoom, startIdx: number, days: number): TimelineTicks {
  return {
    days: dayColumns(startIdx, days),
    weeks: weekTicks(startIdx, days),
    months: monthTicks(startIdx, days),
  };
}
