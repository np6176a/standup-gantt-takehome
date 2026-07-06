import { ACCENTS, AccentName, ThemeMode, UiStore } from '@/stores/uiStore';

/** localStorage keys for persisted UI preferences. */
export const THEME_STORAGE_KEY = 'standup-gantt.theme';
export const ACCENT_STORAGE_KEY = 'standup-gantt.accent';

/**
 * Composition root for all stores. Later milestones add `data` and `planning`
 * stores alongside `ui`; for now it wires the UI store that drives theming.
 */
export class RootStore {
  ui: UiStore;

  constructor(init: { theme?: ThemeMode; accent?: AccentName } = {}) {
    this.ui = new UiStore(init);
  }
}

/** True for a value that is a valid {@link ThemeMode}. */
const isThemeMode = (value: string | null): value is ThemeMode =>
  value === 'light' || value === 'dark';

/** True for a value that is a valid {@link AccentName}. */
const isAccentName = (value: string | null): value is AccentName =>
  value !== null && (ACCENTS as readonly string[]).includes(value);

/**
 * Read persisted theme/accent from localStorage, falling back to the OS
 * color-scheme preference for theme and indigo for accent. Safe to call during
 * SSR (returns empty defaults when `window` is undefined).
 */
function readInitialPreferences(): { theme?: ThemeMode; accent?: AccentName } {
  if (typeof window === 'undefined') return {};

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  const storedAccent = window.localStorage.getItem(ACCENT_STORAGE_KEY);
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;

  return {
    theme: isThemeMode(storedTheme) ? storedTheme : prefersDark ? 'dark' : 'light',
    accent: isAccentName(storedAccent) ? storedAccent : 'indigo',
  };
}

/** Create the root store, seeding UI preferences from localStorage / OS. */
export function createRootStore(): RootStore {
  return new RootStore(readInitialPreferences());
}
