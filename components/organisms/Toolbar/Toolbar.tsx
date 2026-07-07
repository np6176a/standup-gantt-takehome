'use client';

import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';

import { StoreContext } from '@/stores/StoreProvider';
import { GroupingToggle } from '@/components/molecules/GroupingToggle/GroupingToggle';
import { TimeWindowControls } from '@/components/molecules/TimeWindowControls/TimeWindowControls';
import { ThemeSwitcher } from '@/components/molecules/ThemeSwitcher/ThemeSwitcher';

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * The board's top toolbar: grouping toggle (People/Projects) and time-window controls
 * (zoom + ◀ Today ▶), plus the theme switcher. Wires the controlled molecules to the UI
 * store; state filters, the attention chip, search, and "+ New issue" arrive later.
 */
export const Toolbar = observer(function Toolbar({ className = '', ...props }: ToolbarProps) {
  const store = useContext(StoreContext);
  if (!store) return null;

  const { ui } = store;

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

      <ThemeSwitcher className="ml-auto" />
    </div>
  );
});
