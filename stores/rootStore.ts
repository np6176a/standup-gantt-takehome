import { ACCENTS, AccentName, ThemeMode, UiStore } from '@/stores/uiStore';
import { DataStore } from '@/stores/dataStore';

/** localStorage keys for persisted UI preferences. */
export const THEME_STORAGE_KEY = 'standup-gantt.theme';
export const ACCENT_STORAGE_KEY = 'standup-gantt.accent';

/**
 * Composition root for all stores. Holds the UI store (theming, and later grouping/zoom
 * /filters) and the data store (raw fetched issues/PRs + their normalized computeds). A
 * later milestone adds the `planning` store (planned starts + manual blocked flags).
 */
export class RootStore {
  ui: UiStore;
  data: DataStore;

  constructor(init: { theme?: ThemeMode; accent?: AccentName } = {}) {
    this.ui = new UiStore(init);
    this.data = new DataStore();
  }
}

/** True for a value that is a valid {@link ThemeMode}. */
const isThemeMode = (value: string | null): value is ThemeMode =>
  value === 'light' || value === 'dark';

/** True for a value that is a valid {@link AccentName}. */
const isAccentName = (value: string | null): value is AccentName =>
  value !== null && (ACCENTS as readonly string[]).includes(value);

/**
 * Read a key from localStorage, returning null if Web Storage is unavailable.
 * Access can throw a `SecurityError` when storage is denied (privacy settings,
 * sandboxed iframe), so every read is guarded.
 */
function safeReadStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Read persisted theme/accent from localStorage, falling back to the OS
 * color-scheme preference for theme and indigo for accent. Safe to call during
 * SSR (returns empty defaults when `window` is undefined) and when storage is
 * denied (falls back to defaults instead of throwing).
 */
function readInitialPreferences(): { theme?: ThemeMode; accent?: AccentName } {
  if (typeof window === 'undefined') return {};

  const storedTheme = safeReadStorage(THEME_STORAGE_KEY);
  const storedAccent = safeReadStorage(ACCENT_STORAGE_KEY);
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;

  return {
    theme: isThemeMode(storedTheme) ? storedTheme : prefersDark ? 'dark' : 'light',
    accent: isAccentName(storedAccent) ? storedAccent : 'indigo',
  };
}

/**
 * Persist theme/accent to localStorage. Best-effort: silently ignores failures
 * when storage is unavailable so callers never crash on a `SecurityError`.
 */
export function persistPreferences(theme: ThemeMode, accent: AccentName): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  } catch {
    // Storage denied — preferences won't survive reload, but the app keeps working.
  }
}

/** Create the root store, seeding UI preferences from localStorage / OS. */
export function createRootStore(): RootStore {
  return new RootStore(readInitialPreferences());
}
