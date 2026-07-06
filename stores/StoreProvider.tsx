'use client';

import React, { createContext, useEffect, useState } from 'react';
import { reaction } from 'mobx';

import {
  ACCENT_STORAGE_KEY,
  RootStore,
  THEME_STORAGE_KEY,
  createRootStore,
} from '@/stores/rootStore';

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
 * tokens follow the store.
 */
export const StoreProvider = ({ children }: StoreProviderProps) => {
  const [store] = useState(() => createRootStore());

  useEffect(() => {
    const applyTheme = reaction(
      () => ({ theme: store.ui.theme, accent: store.ui.accent }),
      ({ theme, accent }) => {
        const root = document.documentElement;
        root.classList.toggle('dark', theme === 'dark');
        root.dataset.accent = accent;
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
        window.localStorage.setItem(ACCENT_STORAGE_KEY, accent);
      },
      { fireImmediately: true },
    );

    return applyTheme;
  }, [store]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
};
