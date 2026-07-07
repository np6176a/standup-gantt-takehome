'use client';

import React, { createContext, useEffect, useState } from 'react';
import { reaction } from 'mobx';
import { enableStaticRendering } from 'mobx-react-lite';

import {
  RootStore,
  createRootStore,
  persistPreferences,
  persistPlanning,
  persistStateFilter,
  readInitialStateFilter,
} from '@/stores/rootStore';

// On the server, `observer` components must not create subscriptions — otherwise
// per-request reactions/stores can be retained. This runs at module load (before
// any observer renders) and only disables reactivity server-side; the browser
// bundle keeps it enabled. StoreProvider is imported by the root layout, so this
// is set before the tree renders.
enableStaticRendering(typeof window === 'undefined');

/**
 * React context holding the app's {@link RootStore}. Components read stores via
 * `useContext(StoreContext)` directly (no custom hooks).
 */
export const StoreContext = createContext<RootStore | null>(null);

export interface StoreProviderProps {
  /** App subtree that reads the stores. */
  children: React.ReactNode;
}

/**
 * Instantiates the root store once (client-only) and provides it to the tree.
 * Also mirrors the observable theme/accent onto <html> (the `.dark` class and
 * `data-accent` attribute) and persists them to localStorage, so the CSS design
 * tokens follow the store, and persists the app-owned planning state (planned starts
 * + manual blocked flags) and the toolbar state-filter selections so they survive a reload.
 */
export const StoreProvider = ({ children }: StoreProviderProps) => {
  const [store] = useState(() => createRootStore());

  useEffect(() => {
    // Restore the persisted state filter AFTER mount (never seeded at construction): the
    // server render and the client's first hydration render both start from the defaults,
    // so the "N hidden" badge can't disagree; the saved selection is layered on only now.
    const savedFilter = readInitialStateFilter();
    if (savedFilter) store.ui.restoreVisibleStates(savedFilter);

    const applyTheme = reaction(
      () => ({ theme: store.ui.theme, accent: store.ui.accent }),
      ({ theme, accent }) => {
        const root = document.documentElement;
        root.classList.toggle('dark', theme === 'dark');
        root.dataset.accent = accent;
        persistPreferences(theme, accent);
      },
      { fireImmediately: true },
    );

    // Planning state is app-owned (Linear/GitHub don't hold it), so localStorage is its
    // only home. `snapshot` is a plain deep copy, so the reaction re-fires on any change to
    // the planned-start or blocked-flag maps. No `fireImmediately`: the initial value was
    // just restored from storage, so persisting it again on mount would be a no-op write.
    const persistPlan = reaction(
      () => store.planning.snapshot,
      (snapshot) => persistPlanning(snapshot),
    );

    // The toolbar state filter is a UI preference, so it persists like theme/accent. Its
    // actions replace the map wholesale, so the reaction re-fires on any toggle. No
    // `fireImmediately`, and it's created after the restore above, so the just-restored
    // value is its baseline — persisting on mount would be a redundant write.
    const persistFilter = reaction(
      () => store.ui.visibleStates,
      (visibleStates) => persistStateFilter(visibleStates),
    );

    return () => {
      applyTheme();
      persistPlan();
      persistFilter();
    };
  }, [store]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
};
