import {
  normalizePullRequests,
  prKey,
  prsByIssueKey,
  resolveIssueKey,
  type PullRequest,
} from '@/lib/normalize/pullRequests';
import { knownIdentifiers, normalizeIssues } from '@/lib/normalize/issues';
import {
  seedGithubPullRequests,
  seedLinearIssueNodes,
  type RawGithubPullRequestNode,
} from '@/lib/fake-source/seed';

const NOW = new Date('2026-07-06T12:00:00.000Z');
const known = knownIdentifiers(normalizeIssues(seedLinearIssueNodes(NOW)));
const raws = seedGithubPullRequests(NOW);
const normalized = normalizePullRequests(raws, known);
const pr = (number: number): PullRequest =>
  normalized.find((entry) => entry.number === number)!;

describe('resolveIssueKey', () => {
  it('matches the branch name first', () => {
    expect(resolveIssueKey('pnadkarni/orb-101-tile-cache', 'Tile cache', known)).toBe('ORB-101');
  });

  it('falls back to the title when the branch has no key', () => {
    expect(resolveIssueKey('mwebb-dev/manifest-rework', 'ORB-104: Export manifest', known)).toBe(
      'ORB-104',
    );
  });

  it('returns null for an orphan (no key anywhere)', () => {
    expect(resolveIssueKey('sokafor/dependency-label-sorting', 'Dependency label sorting', known)).toBeNull();
  });

  it('rejects a key that is not a known identifier', () => {
    expect(resolveIssueKey('someone/orb-999-ghost', 'ORB-999 ghost', known)).toBeNull();
  });
});

describe('normalizePullRequests', () => {
  it('resolves branch- and title-based keys, and leaves orphans null', () => {
    expect(pr(502).issueKey).toBe('ORB-101'); // by branch
    expect(pr(515).issueKey).toBe('ORB-115'); // by title only
    expect(pr(535).issueKey).toBeNull(); // orphan
    expect(pr(539).issueKey).toBeNull(); // ghost author, no key
  });

  it('detects a stacked PR and points it at its parent', () => {
    const child = pr(509);
    expect(child.stackParentKey).toBe(prKey({ owner: 'orbital', name: 'voyager' }, 508));
    expect(child.issueKey).toBe('ORB-106');
  });

  it('lets a keyless stack child inherit its parent’s issue', () => {
    const parent = {
      repo: { owner: 'orbital', name: 'voyager' },
      node: {
        ...raws.find((entry) => entry.node.number === 508)!.node,
      } as RawGithubPullRequestNode,
    };
    const child: { repo: { owner: string; name: string }; node: RawGithubPullRequestNode } = {
      repo: { owner: 'orbital', name: 'voyager' },
      node: {
        ...parent.node,
        number: 599,
        title: 'follow-up with no key',
        headRefName: 'iolsen/no-key-child',
        baseRefName: parent.node.headRefName,
      },
    };
    const [, normalizedChild] = normalizePullRequests([parent, child], known);
    expect(normalizedChild.stackParentKey).toBe(prKey(parent.repo, 508));
    expect(normalizedChild.issueKey).toBe('ORB-106');
  });

  it('keeps an outside author’s login but resolves no roster person', () => {
    const outside = pr(504);
    expect(outside.author).toBeNull();
    expect(outside.authorLogin).toBe('octo-intern');
  });

  it('derives the first-commit start edge', () => {
    expect(pr(502).firstCommitAt).toBe(raws.find((e) => e.node.number === 502)!.node.commits.nodes[0].commit.committedDate);
  });

  it('groups PRs by issue, excluding orphans, and keeps parallel PRs together', () => {
    const grouped = prsByIssueKey(normalized);
    expect(grouped.get('ORB-119')?.map((p) => p.number).sort()).toEqual([511, 528, 529]);
    expect([...grouped.values()].flat().some((p) => p.issueKey === null)).toBe(false);
  });
});
