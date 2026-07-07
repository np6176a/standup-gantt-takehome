import { makeAutoObservable, runInAction } from 'mobx';

import type { Person } from '@/lib/domain/types';
import type { Issue } from '@/lib/domain/types';
import type { WireIssueNode } from '@/lib/domain/wire';
import { ROSTER } from '@/lib/domain/roster';
import { knownIdentifiers, normalizeIssuesMemoized } from '@/lib/normalize/issues';
import {
  normalizePullRequests,
  prsByIssueKey,
  type PullRequest,
} from '@/lib/normalize/pullRequests';
import type { ReviewOutcome } from '@/lib/normalize/reviews';
import {
  fetchIssues,
  createIssue,
  updateIssue,
  deleteIssue,
  type IssueCreateInput,
  type IssueUpdateInput,
} from '@/lib/api/linear';
import { fetchPullRequests, type RawPullRequest } from '@/lib/api/github';

/** The lifecycle of the one-shot initial load. Drives the app's loading/error gates. */
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/** A reviewer's still-open request on a specific PR — one row of the "Needs review" panel. */
export interface PendingReview {
  pr: PullRequest;
  outcome: ReviewOutcome;
}

/**
 * The raw-data boundary store. It holds ONLY the raw fetched wire state (plus load
 * status) as observables; every derived view is a computed that delegates to a pure
 * `lib/` function, so all real logic stays class-free and unit-tested. Mutations enter
 * through actions ({@link loadAll}, {@link applyIssueNode}) and computeds re-derive.
 */
export class DataStore {
  /** Raw Linear issue nodes, exactly as fetched. Normalized lazily by {@link issues}. */
  rawIssues: WireIssueNode[] = [];
  /** Raw GitHub PR nodes tagged with their repo, as fetched across all repos × states. */
  rawPrs: RawPullRequest[] = [];
  status: LoadStatus = 'idle';
  error: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  /**
   * The normalized issues (raw state retained, bucket + assignee resolved). Memoized
   * per raw node, so a single-issue mutation re-normalizes only the changed node and
   * leaves every other row's Issue reference stable for downstream bail-outs.
   */
  get issues(): Issue[] {
    return normalizeIssuesMemoized(this.rawIssues);
  }

  /** The canonical six-person team (app-owned roster, the identity source of truth). */
  get people(): readonly Person[] {
    return ROSTER;
  }

  /** The normalized PRs, resolved to issues against the live identifier set. */
  get pullRequests(): PullRequest[] {
    return normalizePullRequests(this.rawPrs, knownIdentifiers(this.issues));
  }

  /**
   * PRs grouped by their resolved issue's *id* (not identifier), so a component holding
   * an {@link Issue} can look up its PRs directly. Orphan PRs (no resolved issue) are
   * excluded here — {@link orphanPullRequests} surfaces them instead.
   */
  get prsByIssueId(): Map<string, PullRequest[]> {
    const byIdentifier = prsByIssueKey(this.pullRequests);
    const byId = new Map<string, PullRequest[]>();
    for (const issue of this.issues) {
      const prs = byIdentifier.get(issue.identifier);
      if (prs) byId.set(issue.id, prs);
    }
    return byId;
  }

  /** PRs that resolved to no known issue — surfaced, never silently dropped. */
  get orphanPullRequests(): PullRequest[] {
    return this.pullRequests.filter((pr) => pr.issueKey === null);
  }

  /**
   * Still-pending review requests grouped by the reviewer's person id — the data behind
   * the lane `👁 n` badge and the "Needs review" panel. Bot/outside/mooted requests are
   * already filtered upstream (only roster reviewers produce a `pending` outcome).
   */
  get pendingReviewsByPersonId(): Map<string, PendingReview[]> {
    const byReviewer = new Map<string, PendingReview[]>();
    for (const pr of this.pullRequests) {
      for (const outcome of pr.reviewOutcomes) {
        if (outcome.status !== 'pending') continue;
        const list = byReviewer.get(outcome.reviewer.id) ?? [];
        list.push({ pr, outcome });
        byReviewer.set(outcome.reviewer.id, list);
      }
    }
    return byReviewer;
  }

  /** Live issue count per raw state name — drives the state-filter popover's counts. */
  get issueCountByState(): Record<string, number> {
    return this.issues.reduce<Record<string, number>>((counts, issue) => {
      counts[issue.stateName] = (counts[issue.stateName] ?? 0) + 1;
      return counts;
    }, {});
  }

  /**
   * Fetch issues and PRs together and populate the raw state. Sets `status` to
   * `loading` → `ready`, or `error` (with a message) on failure. Idempotent enough to
   * call once from the app shell's mount effect.
   */
  async loadAll(): Promise<void> {
    this.status = 'loading';
    this.error = null;
    try {
      const [issues, prs] = await Promise.all([fetchIssues(), fetchPullRequests()]);
      runInAction(() => {
        this.rawIssues = issues;
        this.rawPrs = prs;
        this.status = 'ready';
      });
    } catch (err) {
      runInAction(() => {
        this.status = 'error';
        this.error = err instanceof Error ? err.message : String(err);
      });
    }
  }

  /**
   * Splice a single issue node into the raw set by id (replacing an existing one, or
   * appending a newly created one). Fake-Linear mutations return the complete updated
   * node, so this is the apply-the-response path — computeds re-derive from it.
   */
  applyIssueNode(node: WireIssueNode): void {
    const exists = this.rawIssues.some((issue) => issue.id === node.id);
    this.rawIssues = exists
      ? this.rawIssues.map((issue) => (issue.id === node.id ? node : issue))
      : [...this.rawIssues, node];
  }

  /**
   * Apply an update to one issue (status / due date / assignee / title) and splice the
   * returned node in. Apply-the-response, not optimistic: the write resolves to the
   * complete updated node, so there's no local guessing to reconcile. Rejects on a failed
   * write (unknown assignee, rejected start-date key, …) so the caller's form can show it.
   */
  async saveIssue(id: string, input: IssueUpdateInput): Promise<void> {
    const node = await updateIssue(id, input);
    runInAction(() => this.applyIssueNode(node));
  }

  /**
   * Create an issue and splice the new node in. Returns the new node so the caller can,
   * e.g., select it. Rejects on a failed write (blank title, unknown assignee).
   */
  async createNewIssue(input: IssueCreateInput): Promise<WireIssueNode> {
    const node = await createIssue(input);
    runInAction(() => this.applyIssueNode(node));
    return node;
  }

  /**
   * Delete an issue and drop its raw node so the board's computeds re-derive without it.
   * Rejects on a failed write (e.g. no such issue) so the caller's form can surface it;
   * the raw node is only removed after fake-Linear confirms the delete.
   */
  async deleteIssue(id: string): Promise<void> {
    await deleteIssue(id);
    runInAction(() => {
      this.rawIssues = this.rawIssues.filter((issue) => issue.id !== id);
    });
  }
}
