// Core domain types the whole app speaks in: the normalized records produced by
// `lib/normalize/*` and consumed by the stores and components. Kept framework-free
// and JSON-serializable (dates stay ISO strings; conversion to day indices is the
// gantt scale's job) so these can cross the store boundary untouched.

import type { Bucket } from '@/lib/domain/states';
import type { RepoRef } from '@/lib/domain/wire';

/**
 * A teammate's canonical cross-tool identity. `id` is the Linear user id (the
 * stable key issues carry), `email` joins Linear↔GitHub, `githubLogin` links a
 * person to their PRs and review requests.
 */
export interface Person {
  id: string;
  name: string;
  displayName: string;
  email: string;
  githubLogin: string;
}

/** A project reference carried on an issue (grouping key in Project mode). */
export interface ProjectRef {
  id: string;
  name: string;
}

/** A milestone reference carried on an issue. */
export interface MilestoneRef {
  id: string;
  name: string;
}

/**
 * A normalized Linear issue. The raw `stateName` is always retained (the board
 * keeps granular states legible) alongside its semantic `bucket` (drives
 * color/sort) and `automationOwned` (whether the state is GitHub-automation-driven
 * and therefore locked in the editor).
 */
export interface Issue {
  id: string;
  identifier: string;
  title: string;
  url: string;
  /** Raw Linear state name, e.g. "On Staging" — always shown, never collapsed away. */
  stateName: string;
  bucket: Bucket;
  /** True when the state is advanced by GitHub automation (shown locked in the editor). */
  automationOwned: boolean;
  /** ISO timestamp of the automation-stamped actual start, or null. */
  startedAt: string | null;
  /** Writable due date "YYYY-MM-DD", or null. */
  dueDate: string | null;
  assignee: Person | null;
  project: ProjectRef | null;
  projectMilestone: MilestoneRef | null;
}

export type { RepoRef };
