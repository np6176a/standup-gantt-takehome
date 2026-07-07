'use client';

import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';

import { StoreContext } from '@/stores/StoreProvider';
import { EyeIcon, PlusIcon } from '@/components/icons';
import { Button } from '@/components/atoms/Button/Button';
import { GroupingToggle } from '@/components/molecules/GroupingToggle/GroupingToggle';
import { TimeWindowControls } from '@/components/molecules/TimeWindowControls/TimeWindowControls';
import { ThemeSwitcher } from '@/components/molecules/ThemeSwitcher/ThemeSwitcher';

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * The board's top toolbar: grouping toggle (People/Projects), time-window controls
 * (zoom + ◀ Today ▶), a "Needs review" toggle (opens the review panel, badged with the
 * total waiting count), a "+ New issue" button (opens the create modal), and the theme
 * switcher. Wires the controlled molecules to the UI store; state filters, the attention
 * chip, and search arrive later.
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
      className={`flex flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-3 ${className}`}
      {...props}
    >
      <h1 className="mr-1 text-[1.125rem] font-[var(--font-weight-bold)] text-content">
        Standup
      </h1>

      <GroupingToggle grouping={ui.grouping} onChange={(grouping) => ui.setGrouping(grouping)} />

      <TimeWindowControls
        zoom={ui.zoom}
        onZoomChange={(zoom) => ui.setZoom(zoom)}
        onPrev={() => ui.shiftWindowBy(-1)}
        onToday={() => ui.goToToday()}
        onNext={() => ui.shiftWindowBy(1)}
      />

      <button
        type="button"
        onClick={() => ui.toggleReviewPanel()}
        aria-pressed={ui.reviewPanel.open}
        className={`ml-auto inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[0.8125rem] font-[var(--font-weight-semibold)] transition-colors ${
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

      <Button variant="primary" size="sm" onClick={() => ui.openCreateModal()}>
        <span aria-hidden className="mr-1 flex items-center">
          <PlusIcon size={16} />
        </span>
        New issue
      </Button>

      <ThemeSwitcher />
    </div>
  );
});
