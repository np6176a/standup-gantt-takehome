import React from 'react';

import type { Lane } from '@/lib/gantt/rows';
import type { PullRequest } from '@/lib/normalize/pullRequests';
import type { Zoom } from '@/lib/gantt/scale';
import { dayColumns } from '@/lib/gantt/scale';
import {
  LANE_PADDING_PX,
  ROW_HEIGHT_PX,
  RAIL_WIDTH_PX,
  SHELF_HEIGHT_PX,
  PR_STRIP_PX,
  prChipMode,
} from '@/lib/gantt/density';
import { HEADER_LAYERS, weekendBands } from '@/components/molecules/GanttHeader/GanttHeaderUtil';
import { IssueBar } from '@/components/molecules/IssueBar/IssueBar';
import { PrChip } from '@/components/molecules/PrChip/PrChip';
import { LaneHeader } from '@/components/molecules/LaneHeader/LaneHeader';
import { UnscheduledShelf } from '@/components/molecules/UnscheduledShelf/UnscheduledShelf';
import { placeChips, placeRow } from '@/components/organisms/GanttGroupRow/GanttGroupRowUtil';

export interface GanttGroupRowProps {
  /** The lane to render (header identity + summary + packed rows). */
  lane: Lane;
  /** Active zoom. */
  zoom: Zoom;
  /** Left edge of the visible window, as a day index. */
  windowStartIdx: number;
  /** Window span in days. */
  windowDays: number;
  /** Timeline track width in pixels (for converting bar widths to px). */
  trackWidthPx: number;
  /** Today's day index — feeds overdue badges and open-PR chip end edges. */
  todayIdx: number;
  /** Opens an issue's detail popover. */
  onSelectIssue?: (issueId: string) => void;
  /** Opens a PR (deep-links out to GitHub). */
  onSelectPr?: (pr: PullRequest) => void;
  /** Opens the "Needs review" panel for this lane's person (the 👁 badge). */
  onReviewsClick?: () => void;
  /** Optional className for styling overrides. */
  className?: string;
}

/** One packed row's resolved geometry: its bars, its PR chips, and its vertical placement. */
interface RowLayout {
  key: string;
  bars: ReturnType<typeof placeRow>;
  chips: ReturnType<typeof placeChips>;
  top: number;
  hasChips: boolean;
}

/**
 * One swimlane: a sticky left-rail {@link LaneHeader} (with its attention badge cluster)
 * beside the timeline canvas holding its packed rows of {@link IssueBar}s. Each row that
 * has PRs grows a thin strip of {@link PrChip}s beneath its bars, aligned on the same
 * scale. Weekend shading is drawn behind the bars (at the zooms that show it). No-date
 * issues render in an {@link UnscheduledShelf} strip below the rows; the lane grows to fit.
 */
export const GanttGroupRow = ({
  lane,
  zoom,
  windowStartIdx,
  windowDays,
  trackWidthPx,
  todayIdx,
  onSelectIssue,
  onSelectPr,
  onReviewsClick,
  className = '',
}: GanttGroupRowProps) => {
  const issueCount =
    lane.rows.reduce((total, row) => total + row.length, 0) + lane.unscheduled.length;
  const chipMode = prChipMode(zoom);
  const showShading = HEADER_LAYERS[zoom].showWeekendShading;

  // Rows have variable height: a row with visible PR chips grows a chip strip beneath its
  // bar band. Lay them out top-down with a running offset so each knows where it sits.
  let cursor = LANE_PADDING_PX;
  const rowLayouts: RowLayout[] = lane.rows.map((row, rowIndex) => {
    const bars = placeRow(row, windowStartIdx, windowDays, trackWidthPx);
    const chips =
      chipMode === 'hidden'
        ? []
        : row.flatMap((member) => placeChips(member, windowStartIdx, windowDays, todayIdx));
    const hasChips = chips.length > 0;
    const top = cursor;
    cursor += ROW_HEIGHT_PX + (hasChips ? PR_STRIP_PX : 0);
    return { key: row[0]?.issue.id ?? `row-${rowIndex}`, bars, chips, top, hasChips };
  });

  const rowsBlockHeight = cursor + LANE_PADDING_PX;
  const hasUnscheduled = lane.unscheduled.length > 0;
  const laneHeight = rowsBlockHeight + (hasUnscheduled ? SHELF_HEIGHT_PX : 0);

  return (
    <div className={`flex border-b border-border ${className}`} style={{ minHeight: laneHeight }}>
      <div
        className="sticky left-0 z-10 shrink-0 border-r border-border bg-surface"
        style={{ width: RAIL_WIDTH_PX }}
      >
        <LaneHeader
          title={lane.title}
          person={lane.person}
          issueCount={issueCount}
          summary={lane.summary}
          onReviewsClick={onReviewsClick}
        />
      </div>

      <div className="relative grow" style={{ minWidth: trackWidthPx }}>
        {showShading &&
          weekendBands(dayColumns(windowStartIdx, windowDays), windowStartIdx, windowDays).map(
            (band) => (
              <div
                key={band.idx}
                aria-hidden
                className="absolute inset-y-0 bg-neutral-light opacity-60"
                style={{ left: `${band.leftPct}%`, width: `${band.widthPct}%` }}
              />
            ),
          )}

        {rowLayouts.map((layout) => (
          <React.Fragment key={layout.key}>
            <div
              className="absolute inset-x-0"
              style={{ top: layout.top, height: ROW_HEIGHT_PX }}
            >
              {layout.bars.map((placed) => (
                <IssueBar
                  key={placed.member.issue.id}
                  issue={placed.member.issue}
                  leftPct={placed.leftPct}
                  widthPct={placed.widthPct}
                  barWidthPx={placed.barWidthPx}
                  isMarker={placed.isMarker}
                  clippedLeft={placed.clippedLeft}
                  clippedRight={placed.clippedRight}
                  zoom={zoom}
                  attention={placed.member.attention}
                  todayIdx={todayIdx}
                  onSelect={onSelectIssue}
                />
              ))}
            </div>

            {layout.hasChips && (
              <div
                className="absolute inset-x-0"
                style={{ top: layout.top + ROW_HEIGHT_PX, height: PR_STRIP_PX }}
              >
                {layout.chips.map((chip) => (
                  <PrChip
                    key={`${chip.pr.repo.owner}/${chip.pr.repo.name}#${chip.pr.number}`}
                    pr={chip.pr}
                    leftPct={chip.leftPct}
                    widthPct={chip.widthPct}
                    clippedLeft={chip.clippedLeft}
                    clippedRight={chip.clippedRight}
                    mode={chipMode}
                    stacked={chip.stacked}
                    onSelect={onSelectPr}
                  />
                ))}
              </div>
            )}
          </React.Fragment>
        ))}

        {hasUnscheduled && (
          <div
            className="absolute inset-x-0 border-t border-dashed border-border"
            style={{ top: rowsBlockHeight, height: SHELF_HEIGHT_PX }}
          >
            <UnscheduledShelf
              issues={lane.unscheduled.map((member) => member.issue)}
              onSelectIssue={onSelectIssue}
              stickyLeftPx={RAIL_WIDTH_PX}
            />
          </div>
        )}
      </div>
    </div>
  );
};
