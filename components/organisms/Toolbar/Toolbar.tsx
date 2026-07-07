'use client';

import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';

import { StoreContext } from '@/stores/StoreProvider';
import { EyeIcon, PlusIcon } from '@/components/icons';
import { Button } from '@/components/atoms/Button/Button';
import { GroupingToggle } from '@/components/molecules/GroupingToggle/GroupingToggle';
import { TimeWindowControls } from '@/components/molecules/TimeWindowControls/TimeWindowControls';
import { StateFilterPopover } from '@/components/molecules/StateFilterPopover/StateFilterPopover';
import { AttentionChip } from '@/components/molecules/AttentionChip/AttentionChip';
import { ThemeSwitcher } from '@/components/molecules/ThemeSwitcher/ThemeSwitcher';

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * The board's top toolbar: grouping toggle (People/Projects), time-window controls
 * (zoom + ◀ Today ▶), the "States" filter popover (with live counts), the attention chip
 * (blocked/overdue rollup that filters the board), a "Needs review" toggle (opens the
 * review panel, badged with the total waiting count), a "+ New issue" button (opens the
 * create modal), and the theme switcher. Wires the controlled molecules to the stores.
 *
 * Responsive: on `sm+` everything sits on one wrapping row (the theme switcher included).
 * Below `sm` the controls stack into four full-width rows — Standup + grouping, then the
 * zoom/Today window, then States + attention, then Needs-review + New-issue — while the
 * theme/color switcher is hidden. Each row wrapper is `sm:contents`, so on desktop it
 * dissolves and its children flow back into the single wrapping row unchanged.
 */
export const Toolbar = observer(function Toolbar({ className = '', ...props }: ToolbarProps) {
  const store = useContext(StoreContext);
  if (!store) return null;

  const { ui, data } = store;
  const reviewsWaiting = [...data.pendingReviewsByPersonId.values()].reduce(
    (total, pending) => total + pending.length,
    0,
  );

  return (
    <div
      className={`flex flex-col gap-2 border-b border-border bg-surface px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 ${className}`}
      {...props}
    >
      <div className="flex w-full items-center gap-3 sm:contents">
        <h1 className="mr-1 shrink-0 text-[1.125rem] font-[var(--font-weight-bold)] text-content">
          Standup
        </h1>

        <GroupingToggle
          grouping={ui.grouping}
          onChange={(grouping) => ui.setGrouping(grouping)}
          className="grow sm:grow-0"
        />
      </div>

      <div className="flex w-full sm:contents">
        <TimeWindowControls
          zoom={ui.zoom}
          onZoomChange={(zoom) => ui.setZoom(zoom)}
          onPrev={() => ui.shiftWindowBy(-1)}
          onToday={() => ui.goToToday()}
          onNext={() => ui.shiftWindowBy(1)}
          className="w-full justify-between sm:w-auto sm:justify-normal"
        />
      </div>

      <div className="flex w-full items-center gap-2 sm:contents">
        <StateFilterPopover
          counts={data.issueCountByState}
          visibleStates={ui.visibleStates}
          hiddenCount={ui.hiddenStateCount}
          onSetStatesVisible={(names, visible) => ui.setStatesVisible(names, visible)}
          onReset={() => ui.resetStateFilter()}
          className="grow sm:grow-0"
        />

        <AttentionChip
          blocked={store.attentionTotals.blocked}
          overdue={store.attentionTotals.overdue}
          active={ui.attentionOnly}
          onToggle={() => ui.toggleAttentionOnly()}
          className="grow justify-center sm:grow-0 sm:justify-start"
        />
      </div>

      <div className="flex w-full items-center gap-2 sm:contents">
        <button
          type="button"
          onClick={() => ui.toggleReviewPanel()}
          aria-pressed={ui.reviewPanel.open}
          className={`grow justify-center inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[0.8125rem] font-[var(--font-weight-semibold)] transition-colors sm:ml-auto sm:grow-0 sm:justify-start ${
            ui.reviewPanel.open
              ? 'border-primary bg-primary-muted text-content'
              : 'border-border bg-surface-raised text-content-secondary hover:bg-neutral-light'
          }`}
        >
          <span aria-hidden className="flex items-center"><EyeIcon size={16} /></span>
          Needs review
          {reviewsWaiting > 0 && (
            <span className="rounded bg-neutral-light px-1.5 py-px text-[0.6875rem] text-content-secondary">
              {reviewsWaiting}
            </span>
          )}
        </button>

        <Button
          variant="primary"
          size="sm"
          onClick={() => ui.openCreateModal()}
          className="grow sm:grow-0"
        >
          <span aria-hidden className="mr-1 flex items-center">
            <PlusIcon size={16} />
          </span>
          New issue
        </Button>
      </div>

      <div className="hidden sm:contents">
        <ThemeSwitcher />
      </div>
    </div>
  );
});
