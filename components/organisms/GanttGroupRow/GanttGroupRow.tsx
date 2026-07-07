import React from 'react';

import type { Lane } from '@/lib/gantt/rows';
import type { PullRequest } from '@/lib/normalize/pullRequests';
import type { Zoom } from '@/lib/gantt/scale';
import { dayColumns } from '@/lib/gantt/scale';
import {
  LANE_PADDING_PX,
  BAR_HEIGHT_PX,
  PR_LINE_PX,
  RAIL_WIDTH_PX,
  SHELF_HEIGHT_PX,
  prChipMode,
} from '@/lib/gantt/density';
import { HEADER_LAYERS, weekendBands } from '@/components/molecules/GanttHeader/GanttHeaderUtil';
import { IssueBar } from '@/components/molecules/IssueBar/IssueBar';
import { PrChip } from '@/components/molecules/PrChip/PrChip';
import { LaneHeader } from '@/components/molecules/LaneHeader/LaneHeader';
import { UnscheduledShelf } from '@/components/molecules/UnscheduledShelf/UnscheduledShelf';
import { placeChips, placeRow, type PlacedBar } from '@/components/organisms/GanttGroupRow/GanttGroupRowUtil';

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
  /** Opens an issue's detail (wired in a later milestone). */
  onSelectIssue?: (issueId: string) => void;
  /** Opens a PR (wired in a later milestone). */
  onSelectPr?: (pr: PullRequest) => void;
  /** Opens the "Needs review" panel for this lane's person (the 👁 badge). */
  onReviewsClick?: () => void;
  /** Optional className for styling overrides. */
  className?: string;
}

interface BarWithChips {
  placed: PlacedBar;
  chips: ReturnType<typeof placeChips>;
}

interface RowLayout {
  key: string;
  bars: BarWithChips[];
  top: number;
  height: number;
}

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
  const showChips = chipMode !== 'hidden';

  let cursor = LANE_PADDING_PX;
  const rowLayouts: RowLayout[] = lane.rows.map((row, rowIndex) => {
    const placedBars = placeRow(row, windowStartIdx, windowDays, trackWidthPx);

    const bars: BarWithChips[] = placedBars.map((placed) => {
      const chips = showChips
        ? placeChips(placed.member, windowStartIdx, windowDays, todayIdx)
        : [];
      return { placed, chips };
    });

    const maxPrCount = bars.reduce((max, bar) => Math.max(max, bar.chips.length), 0);
    const height = BAR_HEIGHT_PX + (showChips ? maxPrCount * PR_LINE_PX : 0);
    const top = cursor;
    cursor += height;

    return { key: row[0]?.issue.id ?? `row-${rowIndex}`, bars, top, height };
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
          <div
            key={layout.key}
            className="absolute inset-x-0"
            style={{ top: layout.top, height: layout.height }}
          >
            <div className="relative" style={{ height: layout.height }}>
              {layout.bars.map(({ placed, chips }) => (
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
                >
                  {chips.map((chip) => (
                    <PrChip
                      key={`${chip.pr.repo.owner}/${chip.pr.repo.name}#${chip.pr.number}`}
                      pr={chip.pr}
                      stacked={chip.stacked}
                      onSelect={onSelectPr}
                    />
                  ))}
                </IssueBar>
              ))}
            </div>
          </div>
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
