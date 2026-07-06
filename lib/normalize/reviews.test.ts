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

  it('#530: a reviewer re-requested after asking for changes is pending, so no outstanding CR', () => {
    expect(outcomeFor(530, 'theoramos')?.status).toBe('pending');
    expect(outcomeFor(530, 'dcho')?.status).toBe('completed');
    expect(hasChangesRequested(pairReviews(pr(530)))).toBe(false);
  });
});
