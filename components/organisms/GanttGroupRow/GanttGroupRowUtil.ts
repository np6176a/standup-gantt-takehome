// Pure placement for a lane's bars: turn each positioned issue's span into clamped
// window geometry (via the scale's barMetrics) plus the pixel width the IssueBar needs
// to decide label visibility. Keeps all geometry out of the component render.

import type { PositionedIssue } from '@/lib/gantt/rows';
import type { PullRequest } from '@/lib/normalize/pullRequests';
import { pctToPx } from '@/lib/gantt/density';
import { barMetrics } from '@/lib/gantt/scale';
import { renderInterval } from '@/lib/normalize/issues';
import { prChipInterval } from '@/components/molecules/PrChip/PrChipUtil';

/** A bar's fully-resolved placement within the window, ready to hand to IssueBar. */
export interface PlacedBar {
  member: PositionedIssue;
  leftPct: number;
  widthPct: number;
  barWidthPx: number;
  isMarker: boolean;
  clippedLeft: boolean;
  clippedRight: boolean;
}

/**
 * Place every member of a packed row within the window, dropping any whose span does
 * not overlap the window at all. A due-only span (start === end) becomes a marker.
 */
export function placeRow(
  members: readonly PositionedIssue[],
  windowStartIdx: number,
  windowDays: number,
  trackWidthPx: number,
): PlacedBar[] {
  const placed: PlacedBar[] = [];
  for (const member of members) {
    const interval = renderInterval(member.span);
    if (!interval) continue;
    const metrics = barMetrics(interval.start, interval.end, windowStartIdx, windowDays);
    if (!metrics.visible) continue;
    placed.push({
      member,
      leftPct: metrics.leftPct,
      widthPct: metrics.widthPct,
      barWidthPx: pctToPx(metrics.widthPct, trackWidthPx),
      isMarker: interval.start === interval.end,
      clippedLeft: metrics.clippedLeft,
      clippedRight: metrics.clippedRight,
    });
  }
  return placed;
}

/** A PR chip's resolved placement within the window, ready to hand to PrChip. */
export interface PlacedChip {
  pr: PullRequest;
  leftPct: number;
  widthPct: number;
  clippedLeft: boolean;
  clippedRight: boolean;
  /** True when the PR is stacked on another (rendered indented, dashed). */
  stacked: boolean;
}

/**
 * Place a positioned issue's PR chips within the window, dropping any whose span does not
 * overlap it. Chips use the same {@link barMetrics} scale as the issue bar, so they line
 * up under it; an open PR runs to today (see {@link prChipInterval}).
 */
export function placeChips(
  member: PositionedIssue,
  windowStartIdx: number,
  windowDays: number,
  todayIdx: number,
): PlacedChip[] {
  const placed: PlacedChip[] = [];
  for (const pr of member.prs) {
    const interval = prChipInterval(pr, todayIdx);
    if (!interval) continue;
    const metrics = barMetrics(interval.start, interval.end, windowStartIdx, windowDays);
    if (!metrics.visible) continue;
    placed.push({
      pr,
      leftPct: metrics.leftPct,
      widthPct: metrics.widthPct,
      clippedLeft: metrics.clippedLeft,
      clippedRight: metrics.clippedRight,
      stacked: pr.stackParentKey !== null,
    });
  }
  return placed;
}
