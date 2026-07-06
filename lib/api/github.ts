// fake-GitHub read access: discover pull requests across the team's repos.
//
// fake-GitHub is read-only and answers ONE repo + ONE PR-state per query (mirroring
// GitHub's real `pullRequests(states: [...])` discovery), so a full sweep is the cross
// product of repos × states — 2 × 3 = 6 requests fired together with `Promise.all`.
// Each raw node is tagged with the repo it came from (the wire node has no owner/name),
// which is exactly the `{ repo, node }` shape `normalizePullRequests` consumes.
//
// Boundary decision (see NOTES.md, mirrors roster.ts): the repo list is app-owned config
// declared here, NOT imported from the Fake source's `FAKE_GITHUB_REPOS` — the Fake
// source impersonates GitHub, and which repos a team watches is our configuration.

import type { PullRequestState, RepoRef, WirePullRequestNode } from '@/lib/domain/wire';
import { GraphQLRequestError, postGraphql } from '@/lib/api/graphql';

/** The fake-GitHub GraphQL endpoint (app/api/fake/github). */
export const GITHUB_ENDPOINT = '/api/fake/github';

/** The repos the team's PRs live in (app-owned config, not read from the Fake source). */
export const REPOS: readonly RepoRef[] = [
  { owner: 'orbital', name: 'voyager' },
  { owner: 'orbital', name: 'horizon' },
];

/** The PR lifecycle states we sweep — the full set, so merged/closed history renders. */
export const PR_STATES: readonly PullRequestState[] = ['OPEN', 'MERGED', 'CLOSED'];

/** A raw PR node tagged with its source repo — the input `normalizePullRequests` takes. */
export interface RawPullRequest {
  repo: RepoRef;
  node: WirePullRequestNode;
}

/**
 * The PR discovery query, one repo + state per call. Selects exactly the fields the
 * wire contract declares, including the nested reviews and review-request timeline the
 * review pairing replays.
 */
export const PULL_REQUESTS_QUERY = `
  query PullRequests($owner: String!, $name: String!, $state: PullRequestState!) {
    repository(owner: $owner, name: $name) {
      pullRequests(states: [$state]) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number title state createdAt mergedAt closedAt updatedAt headRefName baseRefName url
          author { login }
          commits(first: 1) { nodes { commit { committedDate authoredDate } } }
          reviews(first: 100) { nodes { author { login } state submittedAt } }
          timelineItems(first: 100, itemTypes: [REVIEW_REQUESTED_EVENT, REVIEW_REQUEST_REMOVED_EVENT]) {
            nodes {
              __typename
              ... on ReviewRequestedEvent { createdAt requestedReviewer { ... on User { login } ... on Bot { login } } }
              ... on ReviewRequestRemovedEvent { createdAt requestedReviewer { ... on User { login } ... on Bot { login } } }
            }
          }
        }
      }
    }
  }
`;

/** The `data` shape one PR-discovery query resolves to (`repository` is null on NOT_FOUND). */
interface PullRequestsQueryData {
  repository: { pullRequests: { nodes: WirePullRequestNode[] } } | null;
}

/** True only when the failure is GitHub's "missing repo" case (every error `NOT_FOUND`). */
function isRepoNotFound(error: unknown): boolean {
  return (
    error instanceof GraphQLRequestError &&
    error.errors.length > 0 &&
    error.errors.every((node) => node.type === 'NOT_FOUND')
  );
}

/**
 * Fetch the PRs for one repo + state. A NOT_FOUND repo (GitHub's HTTP-200 partial:
 * `repository: null` plus a top-level `NOT_FOUND` error) is an expected per-repo skip —
 * we degrade it to an empty slice so one missing repo yields a partial board, the same
 * skip the real API forces. Every OTHER failure (transport error, schema/query error,
 * endpoint outage) is a real load failure and is RETHROWN: swallowing it would let
 * `loadAll` report `ready` with missing PRs, making the board look empty of review work.
 */
async function fetchRepoState(
  repo: RepoRef,
  state: PullRequestState,
): Promise<RawPullRequest[]> {
  try {
    const data = await postGraphql<PullRequestsQueryData>(GITHUB_ENDPOINT, PULL_REQUESTS_QUERY, {
      owner: repo.owner,
      name: repo.name,
      state,
    });
    const nodes = data.repository?.pullRequests.nodes ?? [];
    return nodes.map((node) => ({ repo, node }));
  } catch (error) {
    if (!isRepoNotFound(error)) throw error;
    // eslint-disable-next-line no-console -- surfacing a skipped repo is intentional (spec: don't drop silently).
    console.warn(`fake-GitHub: skipping missing repo ${repo.owner}/${repo.name} [${state}]`);
    return [];
  }
}

/**
 * Sweep every repo × PR-state (2 × 3 = 6 queries) in parallel and flatten the results
 * into one repo-tagged list. Repos that fail are skipped (see {@link fetchRepoState}),
 * never the whole sweep.
 */
export async function fetchPullRequests(): Promise<RawPullRequest[]> {
  const queries = REPOS.flatMap((repo) => PR_STATES.map((state) => fetchRepoState(repo, state)));
  const slices = await Promise.all(queries);
  return slices.flat();
}
