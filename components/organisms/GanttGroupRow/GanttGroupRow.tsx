import React from 'react';

import type { Lane } from '@/lib/gantt/rows';
import type { PullRequest } from '@/lib/normalize/pullRequests';
import type { Zoom } from '@/lib/gantt/scale';
import { dayColumns } from '@/lib/gantt/scale';
import {
  LANE_PADDING_PX,
  BAR_HEIGHT_PX,
  PR_LINE_PX,
  RAIL_WIDTH,
  SHELF_HEIGHT_PX,
  prChipMode,
} from '@/lib/gantt/density';
import { PrIcon } from '@/components/icons';
import { HEADER_LAYERS, weekendBands } from '@/components/molecules/GanttHeader/GanttHeaderUtil';
import { IssueBar } from '@/components/molecules/IssueBar/IssueBar';
import { PrChip } from '@/components/molecules/PrChip/PrChip';
import { LaneHeader } from '@/components/molecules/LaneHeader/LaneHeader';
import { UnscheduledShelf } from '@/components/molecules/UnscheduledShelf/UnscheduledShelf';
import { UNASSIGNED_KEY } from '@/lib/gantt/rows';
import { placeChips, placeRow, type PlacedBar, type PlacedChip } from '@/components/organisms/GanttGroupRow/GanttGroupRowUtil';
import { groupPrsByOwnership, isExternalAuthor } from '@/components/molecules/PrChip/PrChipUtil';

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
  /** Show each bar's assignee avatar (on in project grouping, where lanes aren't people). */
  showAssignee: boolean;
  /** Opens an issue's detail popover. */
  onSelectIssue?: (issueId: string) => void;
  /** Opens a PR (deep-links out to GitHub). */
  onSelectPr?: (pr: PullRequest) => void;
  /** Opens the "Needs review" panel for this lane's person (the 👁 badge). */
  onReviewsClick?: () => void;
  /** Optional className for styling overrides. */
  className?: string;
}

interface GroupedChips {
  ownerChips: PlacedChip[];
  externalChips: PlacedChip[];
  assigneeLogin: string | null;
}

interface BarWithChips {
  placed: PlacedBar;
  grouped: GroupedChips;
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
  showAssignee = false,
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
  const compactChips = chipMode === 'dot';

  let cursor = LANE_PADDING_PX;
  const rowLayouts: RowLayout[] = lane.rows.map((row, rowIndex) => {
    const placedBars = placeRow(row, windowStartIdx, windowDays, trackWidthPx);

    const bars: BarWithChips[] = placedBars.map((placed) => {
      const allChips = showChips
        ? placeChips(placed.member, windowStartIdx, windowDays, todayIdx)
        : [];

      const assigneeLogin = placed.member.issue.assignee?.githubLogin ?? null;
      const allPrs = allChips.map((c) => c.pr);
      const [ownerPrs, externalPrs] = groupPrsByOwnership(allPrs, assigneeLogin);

      const ownerChips = allChips.filter((c) => ownerPrs.includes(c.pr));
      const externalChips = allChips.filter((c) => externalPrs.includes(c.pr));

      return { placed, grouped: { ownerChips, externalChips, assigneeLogin } };
    });

    const maxPrLines = bars.reduce((max, bar) => {
      const total = bar.grouped.ownerChips.length + bar.grouped.externalChips.length;
      return Math.max(max, total);
    }, 0);
    const height = BAR_HEIGHT_PX + (showChips ? maxPrLines * PR_LINE_PX : 0);
    const top = cursor;
    cursor += height;

    return { key: row[0]?.issue.id ?? `row-${rowIndex}`, bars, top, height };
  });

  const rowsBlockHeight = cursor + LANE_PADDING_PX;
  const hasUnscheduled = lane.unscheduled.length > 0;
  const hasOrphans = lane.orphanPrs.length > 0;
  const isUnassigned = lane.key === UNASSIGNED_KEY;
  const ORPHAN_LABEL_PX = 20;
  const ORPHAN_PAD_PX = 16;
  const orphanShelfHeight = hasOrphans ? ORPHAN_LABEL_PX + lane.orphanPrs.length * PR_LINE_PX + ORPHAN_PAD_PX : 0;
  const MIN_LANE_PX = 64;
  const laneHeight = Math.max(MIN_LANE_PX, rowsBlockHeight + (hasUnscheduled ? SHELF_HEIGHT_PX : 0) + orphanShelfHeight);

  return (
    <div className={`flex border-b border-border ${className}`} style={{ minHeight: laneHeight }}>
      <div
        className="sticky left-0 z-10 shrink-0 border-r border-border bg-surface"
        style={{ width: RAIL_WIDTH }}
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
              {layout.bars.map(({ placed, grouped }) => (
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
                  showAssignee={showAssignee}
                  onSelect={onSelectIssue}
                >
                  {grouped.ownerChips.map((chip) => (
                    <PrChip
                      key={`${chip.pr.repo.owner}/${chip.pr.repo.name}#${chip.pr.number}`}
                      pr={chip.pr}
                      stacked={chip.stacked}
                      showAuthor={false}
                      compact={compactChips}
                      onSelect={onSelectPr}
                    />
                  ))}
                  {grouped.ownerChips.length > 0 && grouped.externalChips.length > 0 && (
                    <span aria-hidden className="h-px w-full bg-white/15" />
                  )}
                  {grouped.externalChips.map((chip) => (
                    <PrChip
                      key={`${chip.pr.repo.owner}/${chip.pr.repo.name}#${chip.pr.number}`}
                      pr={chip.pr}
                      stacked={chip.stacked}
                      showAuthor={isExternalAuthor(chip.pr, grouped.assigneeLogin)}
                      compact={compactChips}
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
              stickyLeftPx={RAIL_WIDTH}
            />
          </div>
        )}

        {hasOrphans && (
          <div
            className="absolute inset-x-0 border-t border-dashed border-border"
            style={{ top: rowsBlockHeight + (hasUnscheduled ? SHELF_HEIGHT_PX : 0), height: orphanShelfHeight }}
          >
            <div
              className="sticky flex flex-col gap-px px-3 py-1.5 text-[0.625rem]"
              style={{ left: RAIL_WIDTH }}
            >
              <span className="mb-0.5 flex items-center gap-1 text-[0.6875rem] text-content-muted">
                <PrIcon size={12} className="shrink-0 opacity-60" />
                <span className="font-[var(--font-weight-semibold)]">Orphan PRs</span>
              </span>
              {lane.orphanPrs.map((pr) => (
                <PrChip
                  key={`${pr.repo.owner}/${pr.repo.name}#${pr.number}`}
                  pr={pr}
                  stacked={false}
                  showAuthor={isUnassigned}
                  compact={false}
                  onSelect={onSelectPr}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
