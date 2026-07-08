import { makeAutoObservable } from 'mobx';

import type { ManualBlockedFlag } from '@/lib/normalize/attention';

/**
 * A serializable snapshot of the app-owned planning state — the shape persisted to (and
 * restored from) localStorage. Kept plain so it round-trips through `JSON`.
 */
export interface PlanningSnapshot {
  manualStarts: Record<string, string>;
  blockedFlags: Record<string, ManualBlockedFlag>;
  /** Ids of issues created through this app — the ones the user is allowed to delete. */
  createdIssueIds: string[];
}

/**
 * The app-owned planning store: the two pieces of state Linear/GitHub do NOT hold, so
 * they live client-side. `manualStarts` are the app-owned temporary start dates the user
 * can set on an issue that has no Linear/PR start yet (Linear has no writable start); they
 * are a placeholder Linear overwrites the moment it stamps a real start. `blockedFlags`
 * are the manual "mark blocked" flags standup sets when someone says "I'm blocked" (Linear
 * has no Blocked state); they merge with the derived blocked signal at the row level.
 * `createdIssueIds` records which issues were created through this app — the only ones the
 * detail popover offers to delete.
 *
 * Holds only raw scalar maps/sets as observables; the merge with derived attention and the
 * span derivation stay in pure `lib/` functions. {@link snapshot} is the JSON-serializable
 * payload the {@link StoreProvider} reaction persists to (and restores from) localStorage.
 */
export class PlanningStore {
  /** App-owned manual (temporary) start per issue id, "YYYY-MM-DD". */
  manualStarts: Record<string, string> = {};
  /** Manual "mark blocked" flag per issue id. Only blocked entries are kept. */
  blockedFlags: Record<string, ManualBlockedFlag> = {};
  /** Ids of issues created through this app (deletable while they carry no PR). */
  createdIssueIds: Set<string> = new Set();

  constructor(init: Partial<PlanningSnapshot> = {}) {
    this.manualStarts = { ...init.manualStarts };
    this.blockedFlags = { ...init.blockedFlags };
    this.createdIssueIds = new Set(init.createdIssueIds ?? []);
    makeAutoObservable(this, {}, { autoBind: true });
  }

  /** The manual (temporary) start for an issue, or null when none is set. */
  manualStart(issueId: string): string | null {
    return this.manualStarts[issueId] ?? null;
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
   * Set (or clear, when `date` is null) an issue's app-owned manual (temporary) start.
   * Replaces the map so the computed sees a fresh reference; clearing removes the key entirely.
   */
  setManualStart(issueId: string, date: string | null): void {
    if (date) {
      this.manualStarts = { ...this.manualStarts, [issueId]: date };
    } else {
      const next = { ...this.manualStarts };
      delete next[issueId];
      this.manualStarts = next;
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

  /** Whether an issue was created through this app (and so may be deleted from it). */
  isAppCreated(issueId: string): boolean {
    return this.createdIssueIds.has(issueId);
  }

  /** Record that an issue was created through this app (called after a successful create). */
  markCreated(issueId: string): void {
    this.createdIssueIds.add(issueId);
  }

  /** Drop all app-owned state for an issue — its manual start, blocked flag, and
   * created-id — after it's deleted, so nothing dangles by a now-dead id. */
  forgetIssue(issueId: string): void {
    this.setManualStart(issueId, null);
    this.clearBlocked(issueId);
    this.createdIssueIds.delete(issueId);
  }

  /** A plain, JSON-serializable snapshot for persistence (the localStorage payload). */
  get snapshot(): PlanningSnapshot {
    return {
      manualStarts: { ...this.manualStarts },
      blockedFlags: { ...this.blockedFlags },
      createdIssueIds: [...this.createdIssueIds],
    };
  }
}
