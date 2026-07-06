import { PR_STATES, REPOS, fetchPullRequests } from '@/lib/api/github';
import type { WirePullRequestNode } from '@/lib/domain/wire';

/** A tiny wire PR node — only the fields the sweep tags and flattens are exercised here. */
function prNode(number: number): WirePullRequestNode {
  return {
    number,
    title: `PR ${number}`,
    state: 'OPEN',
    createdAt: '2026-07-01T00:00:00.000Z',
    mergedAt: null,
    closedAt: null,
    updatedAt: null,
    headRefName: 'feat/orb-104',
    baseRefName: 'main',
    url: `https://github.com/orbital/voyager/pull/${number}`,
    author: { login: 'pnadkarni' },
    commits: { nodes: [] },
    reviews: { nodes: [] },
    timelineItems: { nodes: [] },
  };
}

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response;
}

describe('fetchPullRequests', () => {
  const originalFetch = global.fetch;
  const originalWarn = console.warn;

  afterEach(() => {
    global.fetch = originalFetch;
    console.warn = originalWarn;
  });

  it('sweeps every repo × state (6 queries) and tags each node with its repo', async () => {
    // One node per query, its number derived from the variables so we can assert the fan-out.
    const fetchMock = jest.fn(async (_endpoint: string, init?: RequestInit) => {
      const { variables } = JSON.parse(init?.body as string) as {
        variables: { owner: string; name: string; state: string };
      };
      const repoIdx = REPOS.findIndex((r) => r.owner === variables.owner && r.name === variables.name);
      const stateIdx = PR_STATES.indexOf(variables.state as (typeof PR_STATES)[number]);
      const number = 100 + repoIdx * 10 + stateIdx;
      return jsonResponse({ data: { repository: { pullRequests: { nodes: [prNode(number)] } } } });
    });
    global.fetch = fetchMock as typeof fetch;

    const prs = await fetchPullRequests();

    expect(fetchMock).toHaveBeenCalledTimes(REPOS.length * PR_STATES.length);
    expect(prs).toHaveLength(6);
    // Each result carries the repo it came from (the wire node itself has no owner/name).
    const voyagerPrs = prs.filter((pr) => pr.repo.name === 'voyager');
    const horizonPrs = prs.filter((pr) => pr.repo.name === 'horizon');
    expect(voyagerPrs).toHaveLength(3);
    expect(horizonPrs).toHaveLength(3);
  });

  it('skips a NOT_FOUND repo/state (repository: null + NOT_FOUND error) instead of failing the whole sweep', async () => {
    console.warn = jest.fn();
    global.fetch = jest.fn(async (_endpoint: string, init?: RequestInit) => {
      const { variables } = JSON.parse(init?.body as string) as {
        variables: { name: string; state: string };
      };
      // Make one slice fail the way GitHub reports a missing repo (HTTP 200 partial).
      if (variables.name === 'horizon' && variables.state === 'CLOSED') {
        return jsonResponse({
          data: { repository: null },
          errors: [{ type: 'NOT_FOUND', message: 'Could not resolve to a Repository' }],
        });
      }
      return jsonResponse({ data: { repository: { pullRequests: { nodes: [prNode(1)] } } } });
    }) as typeof fetch;

    const prs = await fetchPullRequests();

    // 5 successful slices, the 6th skipped — and it warned rather than threw.
    expect(prs).toHaveLength(5);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('rethrows a non-NOT_FOUND failure instead of hiding it as an empty slice', async () => {
    console.warn = jest.fn();
    // A generic GraphQL error (transport/schema/outage) — NOT a missing repo. Swallowing
    // it would let the board load as "ready" with missing PRs, so it must propagate.
    global.fetch = jest.fn(async () =>
      jsonResponse({ errors: [{ message: 'Internal server error' }] }),
    ) as typeof fetch;

    await expect(fetchPullRequests()).rejects.toThrow('Internal server error');
    expect(console.warn).not.toHaveBeenCalled();
  });
});
