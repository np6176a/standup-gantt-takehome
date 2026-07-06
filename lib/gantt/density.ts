// Rendering density: how wide the timeline track is and when labels degrade, per zoom.
//
// The scale (`scale.ts`) is unit-agnostic — it works in day indices and percentages.
// This module adds the pixel dimension: how many pixels a day gets at each zoom, which
// sets the track's `min-width` so dense windows scroll horizontally instead of crushing.
// It also encodes the zoom table's rule that labels/chips degrade before bars do —
// attention treatments (added in a later milestone) render at every zoom regardless.

import type { Zoom } from '@/lib/gantt/scale';

/** Fixed width of the sticky left label rail (desktop), in pixels. */
export const RAIL_WIDTH_PX = 220;

/** Height of a single packed bar row, in pixels. */
export const ROW_HEIGHT_PX = 30;

/** Vertical padding above+below the packed rows within a lane, in pixels. */
export const LANE_PADDING_PX = 6;

/** Height of a lane's "unscheduled" shelf strip, when it has no-date issues, in pixels. */
export const SHELF_HEIGHT_PX = 34;

/** Height of the thin PR-chip strip beneath a packed row that has PRs, in pixels. */
export const PR_STRIP_PX = 14;

/** How PR chips render at a zoom: full thin bars, collapsed dots, or hidden entirely. */
export type PrChipMode = 'full' | 'dot' | 'hidden';

/**
 * PR-chip density per zoom, following the zoom table: Week/Month show full chips,
 * Quarter collapses them to dots, Year drops inline chips (detail lives in the popover).
 * Attention treatments on the issue bar itself never degrade — only these chips do.
 */
export const PR_CHIP_MODE: Record<Zoom, PrChipMode> = {
  week: 'full',
  fortnight: 'full',
  month: 'full',
  quarter: 'dot',
  year: 'hidden',
};

/** The PR-chip render mode for a zoom. */
export function prChipMode(zoom: Zoom): PrChipMode {
  return PR_CHIP_MODE[zoom];
}

/**
 * Pixels allotted to one day at each zoom. Wide at Week (day labels + PR chips fit),
 * progressively tighter toward Year (slim bars). Multiplied by the window span to get
 * the track width, so bars — positioned as percentages — keep a legible physical size.
 */
export const PX_PER_DAY: Record<Zoom, number> = {
  week: 104,
  fortnight: 60,
  month: 34,
  quarter: 13,
  year: 4.5,
};

/** The timeline track's pixel width for a zoom + window span (its `min-width`). */
export function trackWidthPx(zoom: Zoom, windowDays: number): number {
  return Math.round(windowDays * PX_PER_DAY[zoom]);
}

/**
 * Minimum bar width (px) for its inline label to render, per zoom. Week/Month always
 * label; Quarter labels only bars wide enough to hold text; Year never labels inline
 * (detail lives in the tooltip/popover). Encodes the zoom table's degradation order.
 */
export const BAR_LABEL_MIN_PX: Record<Zoom, number> = {
  week: 0,
  fortnight: 0,
  month: 0,
  quarter: 56,
  year: Number.POSITIVE_INFINITY,
};

/** Whether a bar of the given pixel width shows its inline label at this zoom. */
export function shouldShowBarLabel(zoom: Zoom, barWidthPx: number): boolean {
  return barWidthPx >= BAR_LABEL_MIN_PX[zoom];
}

/** Convert a within-window width percentage to pixels for the current track. */
export function pctToPx(percent: number, trackPx: number): number {
  return (percent / 100) * trackPx;
}

/** Total pixel height of a lane holding `rowCount` packed rows (min one row tall). */
export function laneHeightPx(rowCount: number): number {
  return Math.max(1, rowCount) * ROW_HEIGHT_PX + LANE_PADDING_PX * 2;
}
