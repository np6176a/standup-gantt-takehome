'use client';

import React, { useContext, useEffect } from 'react';
import { observer } from 'mobx-react-lite';

import { StoreContext } from '@/stores/StoreProvider';
import { Button } from '@/components/atoms/Button/Button';
import { Toolbar } from '@/components/organisms/Toolbar/Toolbar';
import { GanttBoard } from '@/components/organisms/GanttBoard/GanttBoard';

export interface GanttAppProps {
  /** Optional className for styling overrides. */
  className?: string;
}

/** Centered status message for the loading / error / empty gates. */
const StatusPanel = ({ children }: { children: React.ReactNode }) => (
  <div className="flex grow items-center justify-center p-8 text-center text-[0.9375rem] text-content-secondary">
    <div>{children}</div>
  </div>
);

/**
 * The app shell: kicks off the one-shot data load on mount, then gates on load status —
 * loading, error (with retry), or an empty roster — before rendering the toolbar and the
 * Gantt board. Everything below reads the same store via context.
 */
export const GanttApp = observer(({ className = '' }: GanttAppProps) => {
  const store = useContext(StoreContext);

  useEffect(() => {
    if (store && store.data.status === 'idle') store.data.loadAll();
  }, [store]);

  if (!store) return null;

  const { data } = store;

  return (
    <main className={`flex h-screen flex-col bg-canvas text-content ${className}`}>
      <Toolbar />

      {(data.status === 'idle' || data.status === 'loading') && (
        <StatusPanel>Loading issues and pull requests…</StatusPanel>
      )}

      {data.status === 'error' && (
        <StatusPanel>
          <p className="mb-3 text-attention-overdue">Couldn’t load the board: {data.error}</p>
          <Button variant="primary" size="md" onClick={() => data.loadAll()}>
            Retry
          </Button>
        </StatusPanel>
      )}

      {data.status === 'ready' && data.issues.length === 0 && (
        <StatusPanel>No issues to show yet.</StatusPanel>
      )}

      {data.status === 'ready' && data.issues.length > 0 && (
        <GanttBoard className="m-4 min-h-0 grow" />
      )}
    </main>
  );
});
