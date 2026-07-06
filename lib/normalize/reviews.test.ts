import { hasChangesRequested, pairReviews } from '@/lib/normalize/reviews';
import {
  seedGithubPullRequests,
  type RawGithubPullRequestNode,
} from '@/lib/fake-source/seed';

const NOW = new Date('2026-07-06T12:00:00.000Z');
const prs = seedGithubPullRequests(NOW).map((entry) => entry.node);
const pr = (number: number): RawGithubPullRequestNode =>
  prs.find((node) => node.number === number)!;

const outcomeFor = (number: number, login: string) =>
  pairReviews(pr(number)).find((outcome) => outcome.reviewer.githubLogin === login);

describe('pairReviews', () => {
  it('#501: requested, nothing submitted → pending', () => {
    expect(outcomeFor(501, 'sokafor')?.status).toBe('pending');
  });

  it('#502: request paired with an approval → completed', () => {
    const outcome = outcomeFor(502, 'dcho');
    expect(outcome?.status).toBe('completed');
    expect(outcome?.reviewState).toBe('APPROVED');
  });

  it('#503: request paired with changes-requested → completed, carrying the state', () => {
    const outcome = outcomeFor(503, 'theoramos');
    expect(outcome?.status).toBe('completed');
    expect(outcome?.reviewState).toBe('CHANGES_REQUESTED');
    expect(hasChangesRequested(pairReviews(pr(503)))).toBe(true);
  });

  it('#504: team reviewer on an outside-authored PR → pending', () => {
    expect(outcomeFor(504, 'sokafor')?.status).toBe('pending');
  });

  it('#505: merged before the requested review ever happened → mooted', () => {
    expect(outcomeFor(505, 'iolsen')?.status).toBe('mooted');
  });

  it('#506: bot reviewer is filtered out entirely', () => {
    expect(pairReviews(pr(506))).toHaveLength(0);
  });

  it('#507: removed → re-requested, with a submission predating the re-request → pending', () => {
    const outcome = outcomeFor(507, 'theoramos');
    expect(outcome?.status).toBe('pending');
    expect(outcome?.respondedAt).toBeNull();
  });

  it('#519: submissions at/after the request → completed (drive-by / same-instant seed)', () => {
    expect(outcomeFor(519, 'dcho')?.status).toBe('completed');
    expect(outcomeFor(519, 'iolsen')?.status).toBe('completed');
    expect(hasChangesRequested(pairReviews(pr(519)))).toBe(false);
  });

  it('#530: a re-requested reviewer is pending, but their prior changes-requested still stands', () => {
    const theo = outcomeFor(530, 'theoramos');
    expect(theo?.status).toBe('pending'); // owes a fresh review (re-requested)
    expect(theo?.reviewState).toBe('CHANGES_REQUESTED'); // ...but the CR keeps blocking
    expect(outcomeFor(530, 'dcho')?.status).toBe('completed');
    expect(hasChangesRequested(pairReviews(pr(530)))).toBe(true);
  });
});

// --- Synthetic PRs for edge cases the seed doesn't cover ---------------------------

type ReviewNode = RawGithubPullRequestNode['reviews']['nodes'][number];
type TimelineNode = RawGithubPullRequestNode['timelineItems']['nodes'][number];

const requested = (login: string, at: string): TimelineNode => ({
  __typename: 'ReviewRequestedEvent',
  createdAt: at,
  requestedReviewer: { login },
});
const review = (login: string, state: ReviewNode['state'], at: string): ReviewNode => ({
  author: { login },
  state,
  submittedAt: at,
});

function syntheticPr(over: {
  state?: RawGithubPullRequestNode['state'];
  reviews?: ReviewNode[];
  timeline?: TimelineNode[];
}): RawGithubPullRequestNode {
  return {
    number: 900,
    title: 'synthetic',
    state: over.state ?? 'OPEN',
    createdAt: '2026-07-01T00:00:00.000Z',
    mergedAt: null,
    closedAt: null,
    updatedAt: null,
    headRefName: 'theoramos/synthetic',
    baseRefName: 'main',
    url: 'https://example.test/pull/900',
    author: { login: 'dcho' },
    commits: { nodes: [] },
    reviews: { nodes: over.reviews ?? [] },
    timelineItems: { nodes: over.timeline ?? [] },
  };
}

describe('pairReviews — effective verdict (decisive vs trailing comment)', () => {
  it('a comment after a changes-requested does NOT clear the changes-requested', () => {
    const node = syntheticPr({
      timeline: [requested('theoramos', '2026-07-01T00:00:00.000Z')],
      reviews: [
        review('theoramos', 'CHANGES_REQUESTED', '2026-07-02T00:00:00.000Z'),
        review('theoramos', 'COMMENTED', '2026-07-03T00:00:00.000Z'), // later, non-decisive
      ],
    });
    const outcome = pairReviews(node).find((o) => o.reviewer.githubLogin === 'theoramos');
    expect(outcome?.status).toBe('completed');
    expect(outcome?.reviewState).toBe('CHANGES_REQUESTED'); // decisive verdict wins
    expect(hasChangesRequested(pairReviews(node))).toBe(true);
  });

  it('an approval after an earlier comment resolves to approved (latest decisive wins)', () => {
    const node = syntheticPr({
      timeline: [requested('theoramos', '2026-07-01T00:00:00.000Z')],
      reviews: [
        review('theoramos', 'COMMENTED', '2026-07-02T00:00:00.000Z'),
        review('theoramos', 'APPROVED', '2026-07-03T00:00:00.000Z'),
      ],
    });
    const outcome = pairReviews(node).find((o) => o.reviewer.githubLogin === 'theoramos');
    expect(outcome?.reviewState).toBe('APPROVED');
    expect(hasChangesRequested(pairReviews(node))).toBe(false);
  });
});

describe('pairReviews — compares instants, not ISO strings', () => {
  it('pairs a submission that is chronologically after a differently-formatted request', () => {
    // Request at 2026-07-02T00:00+06:00 === 2026-07-01T18:00Z. The submission at
    // 2026-07-01T20:00Z is two hours LATER (answers it) but sorts BEFORE the request
    // lexicographically ("2026-07-01…" < "2026-07-02…"), which a string compare mis-orders.
    const node = syntheticPr({
      timeline: [requested('theoramos', '2026-07-02T00:00:00.000+06:00')],
      reviews: [review('theoramos', 'APPROVED', '2026-07-01T20:00:00.000Z')],
    });
    expect(
      pairReviews(node).find((o) => o.reviewer.githubLogin === 'theoramos')?.status,
    ).toBe('completed');
  });
});
