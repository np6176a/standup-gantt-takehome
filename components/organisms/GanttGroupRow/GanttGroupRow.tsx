import React from 'react';

import type { Lane } from '@/lib/gantt/rows';
import type { Zoom } from '@/lib/gantt/scale';
import { dayColumns } from '@/lib/gantt/scale';
import {
  LANE_PADDING_PX,
  ROW_HEIGHT_PX,
  RAIL_WIDTH_PX,
  SHELF_HEIGHT_PX,
  laneHeightPx,
} from '@/lib/gantt/density';
import { HEADER_LAYERS, weekendBands } from '@/components/molecules/GanttHeader/GanttHeaderUtil';
import { IssueBar } from '@/components/molecules/IssueBar/IssueBar';
import { LaneHeader } from '@/components/molecules/LaneHeader/LaneHeader';
import { UnscheduledShelf } from '@/components/molecules/UnscheduledShelf/UnscheduledShelf';
import { placeRow } from '@/components/organisms/GanttGroupRow/GanttGroupRowUtil';

export interface GanttGroupRowProps {
  /** The lane to render (header identity + packed rows). */
  lane: Lane;
  /** Active zoom. */
  zoom: Zoom;
  /** Left edge of the visible window, as a day index. */
  windowStartIdx: number;
  /** Window span in days. */
  windowDays: number;
  /** Timeline track width in pixels (for converting bar widths to px). */
  trackWidthPx: number;
  /** Opens an issue's detail (wired in a later milestone). */
  onSelectIssue?: (issueId: string) => void;
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * One swimlane: a sticky left-rail {@link LaneHeader} beside the timeline canvas holding
 * its packed rows of {@link IssueBar}s. The timeline is the percentage-positioning context
 * for the bars; weekend shading is drawn behind them (at the zooms that show it) so bars
 * line up with the header above. No-date issues can't sit on the timeline, so they render
 * in an {@link UnscheduledShelf} strip below the rows. The lane grows to fit both.
 */
export const GanttGroupRow = ({
  lane,
  zoom,
  windowStartIdx,
  windowDays,
  trackWidthPx,
  onSelectIssue,
  className = '',
}: GanttGroupRowProps) => {
  const issueCount = lane.rows.reduce((total, row) => total + row.length, 0) + lane.unscheduled.length;
  const rowsBlockHeight = laneHeightPx(lane.rows.length);
  const hasUnscheduled = lane.unscheduled.length > 0;
  const laneHeight = rowsBlockHeight + (hasUnscheduled ? SHELF_HEIGHT_PX : 0);
  const showShading = HEADER_LAYERS[zoom].showWeekendShading;

  return (
    <div
      className={`flex border-b border-border ${className}`}
      style={{ minHeight: laneHeight }}
    >
      <div
        className="sticky left-0 z-10 shrink-0 border-r border-border bg-surface"
        style={{ width: RAIL_WIDTH_PX }}
      >
        <LaneHeader title={lane.title} person={lane.person} issueCount={issueCount} />
      </div>

      <div className="relative grow" style={{ minWidth: trackWidthPx }}>
        {showShading &&
          weekendBands(dayColumns(windowStartIdx, windowDays), windowStartIdx, windowDays).map(
            (band) => (
              <div
                key={band.idx}
                aria-hidden
                className="absolute inset-y-0 bg-neutral-light/60"
                style={{ left: `${band.leftPct}%`, width: `${band.widthPct}%` }}
              />
            ),
          )}

        {lane.rows.map((row, rowIndex) => (
          <div
            key={row[0]?.issue.id ?? `row-${rowIndex}`}
            className="absolute inset-x-0"
            style={{ top: LANE_PADDING_PX + rowIndex * ROW_HEIGHT_PX, height: ROW_HEIGHT_PX }}
          >
            {placeRow(row, windowStartIdx, windowDays, trackWidthPx).map((placed) => (
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
                onSelect={onSelectIssue}
              />
            ))}
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
