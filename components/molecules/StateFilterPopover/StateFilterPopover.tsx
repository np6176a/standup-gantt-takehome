'use client';

import React, { useEffect, useRef, useState } from 'react';

import { FilterIcon } from '@/components/icons';
import {
  buildStateFilterGroups,
  type StateFilterGroup,
} from '@/components/molecules/StateFilterPopover/StateFilterPopoverUtil';

export interface StateFilterPopoverProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Live issue count per raw state name (from `dataStore.issueCountByState`). */
  counts: Record<string, number>;
  /** Which raw states are currently shown (the toolbar's visibility map). */
  visibleStates: Record<string, boolean>;
  /** Number of states currently hidden — badged on the button. */
  hiddenCount: number;
  /** Show or hide a set of raw states (one row, or a whole bucket header). */
  onSetStatesVisible: (stateNames: readonly string[], visible: boolean) => void;
  /** Restore the default filter (Backlog/Triage/Canceled hidden). */
  onReset: () => void;
  /** Optional className for styling overrides. */
  className?: string;
}

/** A single state's checkbox row: name + live count. */
const StateRow = ({
  name,
  count,
  visible,
  onToggle,
}: {
  name: string;
  count: number;
  visible: boolean;
  onToggle: () => void;
}) => (
  <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-neutral-light">
    <input
      type="checkbox"
      checked={visible}
      onChange={onToggle}
      className="h-3.5 w-3.5 shrink-0 accent-[var(--color-primary)]"
    />
    <span className="grow text-[0.8125rem] text-content">{name}</span>
    <span className="shrink-0 text-[0.6875rem] tabular-nums text-content-muted">{count}</span>
  </label>
);

/** One bucket section: a header checkbox toggling the whole bucket, then its state rows. */
const BucketSection = ({
  group,
  onSetStatesVisible,
}: {
  group: StateFilterGroup;
  onSetStatesVisible: (stateNames: readonly string[], visible: boolean) => void;
}) => {
  const stateNames = group.rows.map((row) => row.name);
  return (
    <div className="py-1">
      <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-neutral-light">
        <input
          type="checkbox"
          checked={group.allVisible}
          onChange={() => onSetStatesVisible(stateNames, !group.allVisible)}
          className="h-3.5 w-3.5 shrink-0 accent-[var(--color-primary)]"
        />
        <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${group.dotClass}`} />
        <span className="grow text-[0.75rem] font-[var(--font-weight-semibold)] uppercase tracking-[0.03em] text-content-secondary">
          {group.label}
        </span>
        <span className="shrink-0 text-[0.6875rem] tabular-nums text-content-muted">
          {group.count}
        </span>
      </label>
      <div className="pl-6">
        {group.rows.map((row) => (
          <StateRow
            key={row.name}
            name={row.name}
            count={row.count}
            visible={row.visible}
            onToggle={() => onSetStatesVisible([row.name], !row.visible)}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Toolbar "States" filter: a button (badged with the hidden-state count) opening a popover
 * that lists all 12 raw states grouped by bucket, each with a checkbox and a live issue
 * count, plus per-bucket header checkboxes and a footer to show all / reset to defaults.
 * Controlled — the parent owns the counts and visibility map and re-renders on each change.
 * Local `open` state and outside-click/Escape dismissal are the component's own UI concern.
 */
export const StateFilterPopover = ({
  counts,
  visibleStates,
  hiddenCount,
  onSetStatesVisible,
  onReset,
  className = '',
  ...props
}: StateFilterPopoverProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const groups = buildStateFilterGroups(counts, visibleStates);
  const allStateNames = groups.flatMap((group) => group.rows.map((row) => row.name));

  return (
    <div ref={rootRef} className={`relative ${className}`} {...props}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[0.8125rem] font-[var(--font-weight-semibold)] transition-colors ${
          hiddenCount > 0
            ? 'border-primary bg-primary-muted text-content'
            : 'border-border bg-surface-raised text-content-secondary hover:bg-neutral-light'
        }`}
      >
        <span aria-hidden className="flex items-center">
          <FilterIcon size={16} />
        </span>
        States
        {hiddenCount > 0 && (
          <span className="rounded bg-neutral-light px-1.5 py-px text-[0.6875rem] text-content-secondary">
            {hiddenCount} hidden
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Filter by state"
          className="absolute left-0 top-[calc(100%+0.375rem)] z-40 max-h-[70vh] w-64 overflow-y-auto rounded-lg border border-border bg-surface p-1.5 shadow-lg"
        >
          {groups.map((group) => (
            <BucketSection
              key={group.bucket}
              group={group}
              onSetStatesVisible={onSetStatesVisible}
            />
          ))}

          <div className="mt-1 flex items-center justify-between border-t border-border px-1.5 pt-2 text-[0.75rem]">
            <button
              type="button"
              onClick={() => onSetStatesVisible(allStateNames, true)}
              className="font-[var(--font-weight-semibold)] text-primary hover:underline"
            >
              Show all
            </button>
            <button
              type="button"
              onClick={onReset}
              className="font-[var(--font-weight-semibold)] text-content-secondary hover:underline"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
