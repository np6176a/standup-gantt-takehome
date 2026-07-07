import { makeAutoObservable } from 'mobx';

import type { ManualBlockedFlag } from '@/lib/normalize/attention';

/**
 * A serializable snapshot of the app-owned planning state — the shape persisted to (and
 * restored from) localStorage. Kept plain so it round-trips through `JSON`.
 */
export interface PlanningSnapshot {
  plannedStarts: Record<string, string>;
  blockedFlags: Record<string, ManualBlockedFlag>;
}

/**
 * The app-owned planning store: the two pieces of state Linear/GitHub do NOT hold, so
 * they live client-side. `plannedStarts` are the app-owned planned start dates that
 * render as the ghost segment before an issue's actual start (Linear has no writable
 * start). `blockedFlags` are the manual "mark blocked" flags standup sets when someone
 * says "I'm blocked" (Linear has no Blocked state); they merge with the derived blocked
 * signal at the row level.
 *
 * Holds only raw scalar maps as observables; the merge with derived attention and the
 * span derivation stay in pure `lib/` functions. {@link snapshot} is the JSON-serializable
 * payload the {@link StoreProvider} reaction persists to (and restores from) localStorage.
 */
export class PlanningStore {
  /** App-owned planned start per issue id, "YYYY-MM-DD". */
  plannedStarts: Record<string, string> = {};
  /** Manual "mark blocked" flag per issue id. Only blocked entries are kept. */
  blockedFlags: Record<string, ManualBlockedFlag> = {};

  constructor(init: Partial<PlanningSnapshot> = {}) {
    this.plannedStarts = { ...init.plannedStarts };
    this.blockedFlags = { ...init.blockedFlags };
    makeAutoObservable(this, {}, { autoBind: true });
  }

  /** The planned start for an issue, or null when none is set. */
  plannedStart(issueId: string): string | null {
    return this.plannedStarts[issueId] ?? null;
  }

  /** Whether an issue is manually flagged blocked. */
  isBlocked(issueId: string): boolean {
    return this.blockedFlags[issueId]?.blocked === true;
  }

  /** The manual blocked reason for an issue, or null when unset / not blocked. */
  blockedReason(issueId: string): string | null {
    const flag = this.blockedFlags[issueId];
    return flag?.blocked ? (flag.reason ?? null) : null;
  }

  /**
   * Set (or clear, when `date` is null) an issue's app-owned planned start. Replaces the
   * map so the computed sees a fresh reference; clearing removes the key entirely.
   */
  setPlannedStart(issueId: string, date: string | null): void {
    if (date) {
      this.plannedStarts = { ...this.plannedStarts, [issueId]: date };
    } else {
      const next = { ...this.plannedStarts };
      delete next[issueId];
      this.plannedStarts = next;
    }
  }

  /**
   * Flag an issue blocked with an optional reason. An empty/whitespace reason is dropped
   * so the flag stays a clean `{ blocked: true }` (the merge supplies a default reason).
   */
  setBlocked(issueId: string, reason?: string): void {
    const trimmed = reason?.trim();
    const flag: ManualBlockedFlag = trimmed ? { blocked: true, reason: trimmed } : { blocked: true };
    this.blockedFlags = { ...this.blockedFlags, [issueId]: flag };
  }

  /** Clear an issue's manual blocked flag (removes the key). */
  clearBlocked(issueId: string): void {
    const next = { ...this.blockedFlags };
    delete next[issueId];
    this.blockedFlags = next;
  }

  /** Toggle an issue's manual blocked flag, preserving any reason when re-blocking. */
  toggleBlocked(issueId: string, reason?: string): void {
    if (this.isBlocked(issueId)) {
      this.clearBlocked(issueId);
    } else {
      this.setBlocked(issueId, reason);
    }
  }

  /** A plain, JSON-serializable snapshot for persistence (the localStorage payload). */
  get snapshot(): PlanningSnapshot {
    return { plannedStarts: { ...this.plannedStarts }, blockedFlags: { ...this.blockedFlags } };
  }
}
