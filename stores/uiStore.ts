import { makeAutoObservable } from 'mobx';

/** Light/dark theme selector. Applied as the `.dark` class on <html>. */
export type ThemeMode = 'light' | 'dark';

/** Primary-color options, each a Tailwind palette. Applied as `[data-accent]`. */
export type AccentName = 'indigo' | 'violet' | 'emerald' | 'rose' | 'amber' | 'sky';

/** All selectable accents, in display order (indigo is the default). */
export const ACCENTS: readonly AccentName[] = [
  'indigo',
  'violet',
  'emerald',
  'rose',
  'amber',
  'sky',
] as const;

/** Initial UI preferences, typically read from localStorage / system settings. */
export interface UiStoreInit {
  theme?: ThemeMode;
  accent?: AccentName;
}

/**
 * Observable UI-only state. In this milestone it owns the theme and accent
 * (which drive the CSS design tokens); later milestones extend it with grouping,
 * zoom window, state filters, and selection.
 */
export class UiStore {
  theme: ThemeMode = 'light';
  accent: AccentName = 'indigo';

  constructor(init: UiStoreInit = {}) {
    if (init.theme) this.theme = init.theme;
    if (init.accent) this.accent = init.accent;
    makeAutoObservable(this, {}, { autoBind: true });
  }

  /** Set the light/dark theme explicitly. */
  setTheme(theme: ThemeMode) {
    this.theme = theme;
  }

  /** Flip between light and dark. */
  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
  }

  /** Switch the primary color (accent) hue. */
  setAccent(accent: AccentName) {
    this.accent = accent;
  }
}
