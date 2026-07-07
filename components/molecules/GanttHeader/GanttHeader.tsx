import React from 'react';

import type { Zoom } from '@/lib/gantt/scale';
import { dayColumns, timelineTicks } from '@/lib/gantt/scale';
import {
  HEADER_LAYERS,
  WEEKDAY_LABEL,
  tickLeftPct,
  tickSegments,
  weekendBands,
} from '@/components/molecules/GanttHeader/GanttHeaderUtil';

export interface GanttHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Active zoom — decides which tick layers render. */
  zoom: Zoom;
  /** Left edge of the visible window, as a day index. */
  windowStartIdx: number;
  /** Window span in days. */
  windowDays: number;
  /** Optional className for styling overrides. */
  className?: string;
}

/** Fixed header height, in pixels. Also the vertical extent of the weekend shading. */
export const GANTT_HEADER_HEIGHT_PX = 46;

/**
 * The timeline date header: weekend shading, month bands, week ticks, and (at Week
 * zoom) per-day cells — every layer positioned as a within-window percentage so it
 * aligns exactly with the bars beneath. Renders only the layers the zoom calls for.
 */
export const GanttHeader = ({
  zoom,
  windowStartIdx,
  windowDays,
  className = '',
  ...props
}: GanttHeaderProps) => {
  const layers = HEADER_LAYERS[zoom];
  const days = dayColumns(windowStartIdx, windowDays);
  const ticks = timelineTicks(zoom, windowStartIdx, windowDays);
  const dayWidthPct = (1 / windowDays) * 100;

  return (
    <div
      className={`relative border-b border-border bg-surface ${className}`}
      style={{ height: GANTT_HEADER_HEIGHT_PX }}
      {...props}
    >
      {layers.showWeekendShading &&
        weekendBands(days, windowStartIdx, windowDays).map((band) => (
          <div
            key={band.idx}
            aria-hidden
            className="absolute inset-y-0 bg-neutral-light"
            style={{ left: `${band.leftPct}%`, width: `${band.widthPct}%` }}
          />
        ))}

      {layers.showMonthBands && (
        <div className="absolute inset-x-0 top-0 h-1/2 border-b border-border">
          {tickSegments(ticks.months, windowStartIdx, windowDays).map((segment) => (
            <span
              key={segment.idx}
              className="absolute top-0 truncate px-1.5 py-0.5 text-[0.75rem] font-[var(--font-weight-semibold)] text-content-secondary"
              style={{ left: `${segment.leftPct}%`, maxWidth: `${segment.widthPct}%` }}
            >
              {segment.label}
            </span>
          ))}
        </div>
      )}

      {layers.showWeekTicks &&
        ticks.weeks.map((tick) => (
          <div
            key={tick.idx}
            className="absolute bottom-0 flex h-1/2 items-center"
            style={{ left: `${tickLeftPct(tick.idx, windowStartIdx, windowDays)}%` }}
          >
            <span className="border-l border-border pl-1 text-[0.75rem] text-content-muted">
              {tick.label}
            </span>
          </div>
        ))}

      {layers.showDayCells &&
        days.map((day) => (
          <div
            key={day.idx}
            className={`absolute bottom-0 flex h-full flex-col items-center justify-end gap-0.5 pb-1 text-center ${
              day.isWeekend ? 'text-content-muted' : 'text-content-secondary'
            }`}
            style={{ left: `${tickLeftPct(day.idx, windowStartIdx, windowDays)}%`, width: `${dayWidthPct}%` }}
          >
            <span className="text-[0.625rem] uppercase tracking-[0.03em]">
              {WEEKDAY_LABEL[day.weekday]}
            </span>
            <span className="text-[0.875rem] font-[var(--font-weight-semibold)] text-content">
              {day.dayOfMonth}
            </span>
          </div>
        ))}
    </div>
  );
};
