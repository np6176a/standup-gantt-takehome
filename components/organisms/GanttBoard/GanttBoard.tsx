'use client';

import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';

import { StoreContext } from '@/stores/StoreProvider';
import { RAIL_WIDTH_PX, trackWidthPx } from '@/lib/gantt/density';
import { dayIndexToPercent } from '@/lib/gantt/scale';
import { GanttHeader } from '@/components/molecules/GanttHeader/GanttHeader';
import { TodayLine } from '@/components/molecules/TodayLine/TodayLine';
import { formatDayLabel } from '@/components/molecules/TodayLine/TodayLineUtil';
import { GanttGroupRow } from '@/components/organisms/GanttGroupRow/GanttGroupRow';

export interface GanttBoardProps {
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * The timeline canvas: a single scroll container holding the sticky date header, one
 * {@link GanttGroupRow} per swimlane (with a sticky left label rail), and the full-height
 * today line overlaid across the lanes. Reads the window/zoom/grouping and packed rows
 * straight off the store; the `observer` re-renders it when any of those change.
 */
export const GanttBoard = observer(({ className = '' }: GanttBoardProps) => {
  const store = useContext(StoreContext);
  if (!store) return null;

  const { ui } = store;
  const { zoom, windowStartIdx, windowDays } = ui;
  const track = trackWidthPx(zoom, windowDays);
  const lanes = store.ganttRows;

  const todayPct = dayIndexToPercent(ui.todayIdx, windowStartIdx, windowDays);
  const todayVisible = ui.todayIdx >= windowStartIdx && ui.todayIdx < ui.windowEndIdx;

  return (
    <div className={`relative overflow-auto rounded-lg border border-border bg-canvas ${className}`}>
      <div className="min-w-max">
        <div className="sticky top-0 z-30 flex bg-surface">
          <div
            className="sticky left-0 z-10 shrink-0 border-b border-r border-border bg-surface"
            style={{ width: RAIL_WIDTH_PX }}
          />
          <div className="grow" style={{ minWidth: track }}>
            <GanttHeader zoom={zoom} windowStartIdx={windowStartIdx} windowDays={windowDays} />
          </div>
        </div>

        <div className="relative">
          {lanes.map((lane) => (
            <GanttGroupRow
              key={lane.key}
              lane={lane}
              zoom={zoom}
              windowStartIdx={windowStartIdx}
              windowDays={windowDays}
              trackWidthPx={track}
            />
          ))}

          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0"
            style={{ left: RAIL_WIDTH_PX }}
          >
            <div className="relative h-full">
              <TodayLine
                leftPct={todayPct}
                visible={todayVisible}
                label={formatDayLabel(ui.todayIdx)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
