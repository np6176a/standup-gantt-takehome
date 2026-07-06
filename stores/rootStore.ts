import { makeAutoObservable } from 'mobx';

import { ACCENTS, AccentName, ThemeMode, UiStore } from '@/stores/uiStore';
import { DataStore } from '@/stores/dataStore';
import { buildLanes, type Lane } from '@/lib/gantt/rows';
import { dayIndex } from '@/lib/gantt/scale';

/** localStorage keys for persisted UI preferences. */
export const THEME_STORAGE_KEY = 'standup-gantt.theme';
export const ACCENT_STORAGE_KEY = 'standup-gantt.accent';

/** Construction options for {@link RootStore}. */
export interface RootStoreInit {
  theme?: ThemeMode;
  accent?: AccentName;
  /** Today's day index, captured once by {@link createRootStore}. */
  todayIdx?: number;
}

/**
 * Composition root for all stores. Holds the UI store (theming + grouping/zoom/window)
 * and the data store (raw fetched issues/PRs + their normalized computeds), and exposes
 * the board's grouped/packed rows as a cross-store computed. A later milestone adds the
 * `planning` store (planned starts + manual blocked flags).
 */
export class RootStore {
  ui: UiStore;
  data: DataStore;

  constructor(init: RootStoreInit = {}) {
    this.ui = new UiStore(init);
    this.data = new DataStore();
    // `ui`/`data` are already observable stores — expose them as plain refs so only
    // `ganttRows` here becomes a (cross-store) computed.
    makeAutoObservable(this, { ui: false, data: false }, { autoBind: true });
  }

  /**
   * The board's swimlanes: normalized issues grouped by the active grouping, sorted,
   * and packed into non-overlapping rows. A one-line delegation to the pure
   * {@link buildLanes}, so all row logic stays class-free and unit-tested.
   */
  get ganttRows(): Lane[] {
    return buildLanes({
      issues: this.data.issues,
      grouping: this.ui.grouping,
      people: this.data.people,
      todayIdx: this.ui.todayIdx,
    });
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

/** Create the root store, seeding UI preferences from localStorage / OS and capturing
 * today's day index once (so no computed ever calls `new Date()`). */
export function createRootStore(): RootStore {
  return new RootStore({ ...readInitialPreferences(), todayIdx: dayIndex(new Date()) });
}
