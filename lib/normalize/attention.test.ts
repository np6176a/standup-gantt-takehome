import {
  STALE_REVIEW_DAYS,
  deriveAttention,
  derivedBlocked,
  isOverdue,
} from '@/lib/normalize/attention';
import { knownIdentifiers, normalizeIssues } from '@/lib/normalize/issues';
import { normalizePullRequests, prsByIssueKey, type PullRequest } from '@/lib/normalize/pullRequests';
import type { Issue } from '@/lib/domain/types';
import { seedGithubPullRequests, seedLinearIssueNodes } from '@/lib/fake-source/seed';

const NOW = new Date('2026-07-06T12:00:00.000Z');
const issues = normalizeIssues(seedLinearIssueNodes(NOW));
const prs = normalizePullRequests(seedGithubPullRequests(NOW), knownIdentifiers(issues));
const prsByIssue = prsByIssueKey(prs);
const issue = (id: string): Issue => issues.find((i) => i.identifier === id)!;
const prsFor = (id: string): PullRequest[] => prsByIssue.get(id) ?? [];

describe('isOverdue', () => {
  it('flags a past-due issue that is not Done/Canceled', () => {
    const overdue = issue('ORB-104'); // On Develop, due yesterday
    expect(isOverdue(overdue.dueDate, overdue.bucket, NOW)).toBe(true);
  });

  it('does not flag Done or Canceled issues even when past due', () => {
    const done = issue('ORB-109'); // Done, due -3
    expect(isOverdue(done.dueDate, done.bucket, NOW)).toBe(false);
  });

  it('does not flag a future or missing due date', () => {
    expect(isOverdue(issue('ORB-101').dueDate, issue('ORB-101').bucket, NOW)).toBe(false); // due +4
    expect(isOverdue(null, 'active', NOW)).toBe(false);
  });
});

describe('derivedBlocked', () => {
  it('flags an issue whose open PR has changes requested, naming the PR', () => {
    const result = derivedBlocked(issue('ORB-104'), prsFor('ORB-104'), NOW);
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('changes requested on #503');
  });

  it('does not flag an issue whose PR was merely approved', () => {
    expect(derivedBlocked(issue('ORB-101'), prsFor('ORB-101'), NOW).blocked).toBe(false);
  });

  it('flags an In Review issue with a stale (> 2 day) pending review request', () => {
    const inReview: Issue = { ...issue('ORB-105'), stateName: 'In Review', bucket: 'review' };
    const stalePr: PullRequest = {
      ...prs[0],
      state: 'OPEN',
      hasChangesRequested: false,
      reviewOutcomes: [
        {
          reviewer: issue('ORB-101').assignee!,
          status: 'pending',
          requestedAt: new Date(NOW.getTime() - 5 * 86_400_000).toISOString(),
          respondedAt: null,
          reviewState: null,
        },
      ],
    };
    const result = derivedBlocked(inReview, [stalePr], NOW);
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain(`${STALE_REVIEW_DAYS}`);
  });

  it('does not flag a fresh pending review request', () => {
    const inReview: Issue = { ...issue('ORB-105'), stateName: 'In Review', bucket: 'review' };
    const freshPr: PullRequest = {
      ...prs[0],
      state: 'OPEN',
      hasChangesRequested: false,
      reviewOutcomes: [
        {
          reviewer: issue('ORB-101').assignee!,
          status: 'pending',
          requestedAt: new Date(NOW.getTime() - 1 * 86_400_000).toISOString(),
          respondedAt: null,
          reviewState: null,
        },
      ],
    };
    expect(derivedBlocked(inReview, [freshPr], NOW).blocked).toBe(false);
  });
});

describe('deriveAttention', () => {
  it('combines overdue and derived-blocked for an issue', () => {
    const attention = deriveAttention(issue('ORB-104'), prsFor('ORB-104'), NOW);
    expect(attention).toEqual({
      overdue: true,
      blockedDerived: true,
      blockedReason: 'changes requested on #503',
    });
  });
});
