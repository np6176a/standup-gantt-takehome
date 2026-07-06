// Pure header geometry: which tick layers a zoom draws, and the positioned segments
// (weekend shading, week/month bands) to render — all as within-window percentages so
// the header lines up exactly with the percentage-positioned bars below it.

import type { Zoom } from '@/lib/gantt/scale';
import {
  type DayColumn,
  type Tick,
  dayIndexToPercent,
} from '@/lib/gantt/scale';

/** Which header layers a zoom renders (labels/shading degrade before bars do). */
export interface HeaderLayers {
  /** Weekend day columns shaded (fine-grained zooms only). */
  showWeekendShading: boolean;
  /** Per-day cells with weekday + day-of-month (Week only). */
  showDayCells: boolean;
  /** Week-start ("Mon D") tick labels. */
  showWeekTicks: boolean;
  /** Month band labels beneath the ticks. */
  showMonthBands: boolean;
}

/** Single-letter weekday labels, indexed by UTC weekday (0 = Sunday). */
export const WEEKDAY_LABEL: readonly string[] = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** The tick layers each zoom draws (see the zoom table in the plan). */
export const HEADER_LAYERS: Record<Zoom, HeaderLayers> = {
  week: { showWeekendShading: true, showDayCells: true, showWeekTicks: false, showMonthBands: false },
  month: { showWeekendShading: true, showDayCells: false, showWeekTicks: true, showMonthBands: true },
  quarter: { showWeekendShading: false, showDayCells: false, showWeekTicks: true, showMonthBands: true },
  year: { showWeekendShading: false, showDayCells: false, showWeekTicks: false, showMonthBands: true },
};

/** A left/width percentage band within the window, carrying a day index (+ optional label). */
export interface PositionedBand {
  idx: number;
  label: string;
  leftPct: number;
  widthPct: number;
}

/** One weekend-day shading band per Saturday/Sunday column in the window. */
export function weekendBands(
  days: readonly DayColumn[],
  windowStartIdx: number,
  windowDays: number,
): PositionedBand[] {
  const dayWidthPct = (1 / windowDays) * 100;
  return days
    .filter((day) => day.isWeekend)
    .map((day) => ({
      idx: day.idx,
      label: '',
      leftPct: dayIndexToPercent(day.idx, windowStartIdx, windowDays),
      widthPct: dayWidthPct,
    }));
}

/**
 * Turn ordered ticks into labeled bands, each spanning from its tick to the next tick
 * (the last one runs to the window's right edge). Used for month bands, where the label
 * sits centered within its span. Ticks are assumed sorted ascending by `idx`.
 */
export function tickSegments(
  ticks: readonly Tick[],
  windowStartIdx: number,
  windowDays: number,
): PositionedBand[] {
  const windowEndIdx = windowStartIdx + windowDays;
  return ticks.map((tick, position) => {
    const nextIdx = position + 1 < ticks.length ? ticks[position + 1].idx : windowEndIdx;
    const leftPct = dayIndexToPercent(tick.idx, windowStartIdx, windowDays);
    const rightPct = dayIndexToPercent(nextIdx, windowStartIdx, windowDays);
    return { idx: tick.idx, label: tick.label, leftPct, widthPct: rightPct - leftPct };
  });
}

/** The single-point left percentage for a tick (for thin tick marks + labels). */
export function tickLeftPct(idx: number, windowStartIdx: number, windowDays: number): number {
  return dayIndexToPercent(idx, windowStartIdx, windowDays);
}
