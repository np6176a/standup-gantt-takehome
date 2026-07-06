import { makeAutoObservable } from 'mobx';

import type { Zoom } from '@/lib/gantt/scale';
import {
  dayIndex,
  defaultWindowStart,
  shiftWindow,
  windowDaysForZoom,
} from '@/lib/gantt/scale';

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

/** Swimlane grouping: per-person (standup default) vs per-project (Linear-screenshot). */
export type Grouping = 'person' | 'project';

/** Initial UI preferences, typically read from localStorage / system settings. */
export interface UiStoreInit {
  theme?: ThemeMode;
  accent?: AccentName;
  /**
   * Today's day index, captured once by the composition root so computeds never
   * call `new Date()`. Falls back to the current UTC day when omitted (stories/tests).
   */
  todayIdx?: number;
}

/**
 * Observable UI-only state: theme/accent (drive the CSS design tokens) plus the
 * board's grouping, zoom, and visible time window. Holds only small scalars; every
 * heavier derivation (the grouped/packed rows) lives in a computed that delegates to
 * a pure `lib/gantt` function. Later milestones add state filters and selection.
 */
export class UiStore {
  theme: ThemeMode = 'light';
  accent: AccentName = 'indigo';

  /** Which swimlane grouping the board renders. */
  grouping: Grouping = 'person';
  /** Current timeline zoom; drives the window span and header tick density. */
  zoom: Zoom = 'month';
  /** Left edge of the visible window, as a day index. Shifted by the ◀/▶/Today controls. */
  windowStartIdx: number;
  /** Today's day index, captured once at construction — computeds read this, never `new Date()`. */
  todayIdx: number;

  constructor(init: UiStoreInit = {}) {
    this.todayIdx = init.todayIdx ?? dayIndex(new Date());
    if (init.theme) this.theme = init.theme;
    if (init.accent) this.accent = init.accent;
    this.windowStartIdx = defaultWindowStart(this.todayIdx, this.zoom);
    makeAutoObservable(this, {}, { autoBind: true });
  }

  /** Number of days the visible window spans, derived from the current zoom. */
  get windowDays(): number {
    return windowDaysForZoom(this.zoom);
  }

  /** Day index one past the visible window's right edge (half-open). */
  get windowEndIdx(): number {
    return this.windowStartIdx + this.windowDays;
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

  /** Switch the swimlane grouping (re-keys lanes; the row computed re-derives). */
  setGrouping(grouping: Grouping) {
    this.grouping = grouping;
  }

  /**
   * Change the zoom and re-frame the window around today for the new span, so
   * switching zoom always lands with today in view rather than drifting off-screen.
   */
  setZoom(zoom: Zoom) {
    this.zoom = zoom;
    this.windowStartIdx = defaultWindowStart(this.todayIdx, zoom);
  }

  /** Shift the window one zoom unit earlier (-1) or later (+1). */
  shiftWindowBy(direction: -1 | 1) {
    this.windowStartIdx = shiftWindow(this.windowStartIdx, this.zoom, direction, this.todayIdx);
  }

  /** Recenter the window on today (the "Today" button). */
  goToToday() {
    this.windowStartIdx = shiftWindow(this.windowStartIdx, this.zoom, 0, this.todayIdx);
  }
}
