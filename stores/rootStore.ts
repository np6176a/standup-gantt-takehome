import { makeAutoObservable } from 'mobx';

import { ACCENTS, AccentName, ThemeMode, UiStore } from '@/stores/uiStore';
import { DataStore } from '@/stores/dataStore';
import { PlanningStore } from '@/stores/planningStore';
import type { Issue } from '@/lib/domain/types';
import { buildLanes, type Lane } from '@/lib/gantt/rows';
import { localTodayIndex } from '@/lib/gantt/scale';

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
 * Composition root for all stores. Holds the UI store (theming + grouping/zoom/window +
 * selection), the data store (raw fetched issues/PRs + their normalized computeds), and
 * the planning store (app-owned planned starts + manual blocked flags), and exposes the
 * board's grouped/packed rows as a cross-store computed.
 */
export class RootStore {
  ui: UiStore;
  data: DataStore;
  planning: PlanningStore;

  constructor(init: RootStoreInit = {}) {
    this.ui = new UiStore(init);
    this.data = new DataStore();
    this.planning = new PlanningStore();
    // `ui`/`data`/`planning` are already observable stores — expose them as plain refs so
    // only the cross-store computeds here (`ganttRows`, `selectedIssue`) become computed.
    makeAutoObservable(this, { ui: false, data: false, planning: false }, { autoBind: true });
  }

  /** The issue the detail popover is open on, or null when nothing is selected. */
  get selectedIssue(): Issue | null {
    const id = this.ui.selectedIssueId;
    if (!id) return null;
    return this.data.issues.find((issue) => issue.id === id) ?? null;
  }

  /** Count of still-pending review requests per reviewer person id (drives the lane 👁 badge). */
  get reviewsWaitingByPersonId(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const [personId, pending] of this.data.pendingReviewsByPersonId) {
      counts.set(personId, pending.length);
    }
    return counts;
  }

  /**
   * The board's swimlanes: normalized issues grouped by the active grouping, enriched
   * with attention + PRs, sorted attention-first, and packed into non-overlapping rows.
   * A one-line delegation to the pure {@link buildLanes}, so all row logic stays
   * class-free and unit-tested. `now` is reconstructed from the once-captured `todayIdx`
   * so this computed never calls `new Date()`.
   */
  get ganttRows(): Lane[] {
    return buildLanes({
      issues: this.data.issues,
      grouping: this.ui.grouping,
      people: this.data.people,
      todayIdx: this.ui.todayIdx,
      plannedStarts: this.planning.plannedStarts,
      blockedFlags: this.planning.blockedFlags,
      prsByIssueId: this.data.prsByIssueId,
      now: new Date(),
      reviewsWaitingByPersonId: this.reviewsWaitingByPersonId,
      orphanPrs: this.data.orphanPullRequests,
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
  return new RootStore({ ...readInitialPreferences(), todayIdx: localTodayIndex() });
}
