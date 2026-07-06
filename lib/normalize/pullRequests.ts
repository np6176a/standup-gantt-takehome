// Pull-request normalization: resolve each raw PR to its Linear issue, detect
// stacked chains, resolve the author, and pair its reviews. Read-only — GitHub is a
// read-only source here.
//
// Issue resolution: match ORB-### in the branch name first, then the title,
// validating against the known issue identifiers (a typo'd or stale key resolves to
// null — an orphan, surfaced not dropped). Stacked PRs: a PR whose baseRefName is
// another PR's head branch (in the same repo) is stacked on it and, if it carries no
// key of its own, inherits the parent's issue.

import type { Person, RepoRef } from '@/lib/domain/types';
import type { PullRequestState, WirePullRequestNode } from '@/lib/domain/wire';
import { personByLogin } from '@/lib/domain/roster';
import {
  hasChangesRequested,
  pairReviews,
  type ReviewOutcome,
} from '@/lib/normalize/reviews';

/** A normalized pull request, resolved to its issue and reviewers. */
export interface PullRequest {
  number: number;
  repo: RepoRef;
  title: string;
  state: PullRequestState;
  url: string;
  /** Roster author, or null for a bot/outside/ghost author (login kept below). */
  author: Person | null;
  /** Raw author login, retained even when it resolves to no roster person. */
  authorLogin: string | null;
  /** Resolved Linear issue identifier (e.g. "ORB-105"), or null for an orphan. */
  issueKey: string | null;
  headRefName: string;
  baseRefName: string;
  /** Key of the PR this one is stacked on (`owner/name#number`), or null. */
  stackParentKey: string | null;
  /** ISO time of the first commit — the PR chip's start edge. */
  firstCommitAt: string | null;
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  updatedAt: string | null;
  reviewOutcomes: ReviewOutcome[];
  /** True when a completed review left outstanding CHANGES_REQUESTED (blocked signal). */
  hasChangesRequested: boolean;
}

/** Stable cross-repo key for a PR. */
export function prKey(repo: RepoRef, number: number): string {
  return `${repo.owner}/${repo.name}#${number}`;
}

const ISSUE_KEY_RE = /\borb-\d+\b/i;

/**
 * Resolve a PR to its Linear issue identifier. Branch name is tried first, then the
 * title; a candidate only wins if it is one of the `known` identifiers. Returns the
 * canonical upper-cased key (e.g. "ORB-104"), or null when nothing valid matches.
 */
export function resolveIssueKey(
  headRefName: string,
  title: string,
  known: ReadonlySet<string>,
): string | null {
  for (const source of [headRefName, title]) {
    const match = source.match(ISSUE_KEY_RE)?.[0];
    if (match) {
      const key = match.toUpperCase();
      if (known.has(key)) return key;
    }
  }
  return null;
}

/**
 * Whether the branch or title contains an ORB-### token at all — valid or not. Lets
 * a stale/typo'd key (matches the pattern but isn't a known identifier) be told apart
 * from a truly keyless PR: the former is a surfaced orphan, only the latter inherits a
 * stacked parent's issue.
 */
export function hasIssueKeyToken(headRefName: string, title: string): boolean {
  return ISSUE_KEY_RE.test(headRefName) || ISSUE_KEY_RE.test(title);
}

/** Epoch millis of an ISO timestamp — compare instants numerically, not by string
 *  (lexicographic order breaks across mixed offsets/precisions). */
const epoch = (iso: string): number => new Date(iso).getTime();

/** The earliest commit date on a PR (its start edge), falling back to createdAt.
 *  Earliest by instant, so mixed timezone offsets can't pick the wrong commit. */
function firstCommitAt(node: WirePullRequestNode): string | null {
  const dates = node.commits.nodes.map((entry) => entry.commit.committedDate).filter(Boolean);
  if (dates.length === 0) return node.createdAt ?? null;
  return dates.reduce((earliest, date) => (epoch(date) < epoch(earliest) ? date : earliest));
}

/** A repo-scoped head-branch key, so stack lookups can't collide across repos. */
function headScope(repo: RepoRef, headRefName: string): string {
  return `${repo.owner}/${repo.name}::${headRefName}`;
}

/**
 * Normalize a batch of raw PRs (needs the batch to resolve stacks and to inherit a
 * parent's issue). `knownIdentifiers` is the set of live issue identifiers PRs
 * resolve against.
 */
export function normalizePullRequests(
  raws: ReadonlyArray<{ repo: RepoRef; node: WirePullRequestNode }>,
  knownIdentifiers: ReadonlySet<string>,
): PullRequest[] {
  // Index every PR's head branch → its PR key and the info needed to walk the stack
  // (its own resolved issue key + the branch it is based on).
  const headToPrKey = new Map<string, string>();
  const stackInfoByScope = new Map<
    string,
    { ownKey: string | null; hasKeyToken: boolean; repo: RepoRef; baseRefName: string }
  >();
  for (const { repo, node } of raws) {
    const scope = headScope(repo, node.headRefName);
    headToPrKey.set(scope, prKey(repo, node.number));
    stackInfoByScope.set(scope, {
      ownKey: resolveIssueKey(node.headRefName, node.title, knownIdentifiers),
      hasKeyToken: hasIssueKeyToken(node.headRefName, node.title),
      repo,
      baseRefName: node.baseRefName,
    });
  }

  // Resolve a branch's issue key by walking UP the stack. A valid own key wins. A PR
  // that carries a key TOKEN which isn't a known identifier (stale/typo) is a surfaced
  // orphan — it does NOT inherit, so a typo never silently borrows the parent's issue.
  // Only a truly keyless PR (no token at all) inherits, transitively, so a grandchild
  // whose parent is itself keyless still reaches the keyed root. Visited set guards a cycle.
  const inheritedIssueKey = (startScope: string): string | null => {
    const visited = new Set<string>();
    let scope: string | undefined = startScope;
    while (scope && !visited.has(scope)) {
      visited.add(scope);
      const info = stackInfoByScope.get(scope);
      if (!info) return null;
      if (info.ownKey) return info.ownKey;
      if (info.hasKeyToken) return null; // stale/typo key → orphan, don't inherit
      if (!info.baseRefName || info.baseRefName === 'main') return null;
      scope = headScope(info.repo, info.baseRefName);
    }
    return null;
  };

  return raws.map(({ repo, node }) => {
    const issueKey = inheritedIssueKey(headScope(repo, node.headRefName));
    let stackParentKey: string | null = null;

    if (node.baseRefName && node.baseRefName !== 'main') {
      const parentScope = headScope(repo, node.baseRefName);
      if (headToPrKey.has(parentScope)) {
        stackParentKey = headToPrKey.get(parentScope) ?? null;
      }
    }

    const reviewOutcomes = pairReviews(node);

    return {
      number: node.number,
      repo,
      title: node.title,
      state: node.state,
      url: node.url,
      author: personByLogin(node.author?.login),
      authorLogin: node.author?.login ?? null,
      issueKey,
      headRefName: node.headRefName,
      baseRefName: node.baseRefName,
      stackParentKey,
      firstCommitAt: firstCommitAt(node),
      createdAt: node.createdAt,
      mergedAt: node.mergedAt,
      closedAt: node.closedAt,
      updatedAt: node.updatedAt,
      reviewOutcomes,
      hasChangesRequested: hasChangesRequested(reviewOutcomes),
    };
  });
}

/** Group normalized PRs by resolved issue identifier (orphans excluded). */
export function prsByIssueKey(prs: readonly PullRequest[]): Map<string, PullRequest[]> {
  const grouped = new Map<string, PullRequest[]>();
  for (const pr of prs) {
    if (!pr.issueKey) continue;
    const bucket = grouped.get(pr.issueKey);
    if (bucket) bucket.push(pr);
    else grouped.set(pr.issueKey, [pr]);
  }
  return grouped;
}
