import {
  buildReviewGroups,
  reviewAgeLabel,
  reviewRequestAgeDays,
  totalWaiting,
} from '@/components/organisms/ReviewAttentionPanel/ReviewAttentionPanelUtil';
import type { PendingReview } from '@/stores/dataStore';
import type { PullRequest } from '@/lib/normalize/pullRequests';
import type { RepoRef } from '@/lib/domain/types';
import { ROSTER } from '@/lib/domain/roster';

const REPO: RepoRef = { owner: 'orbital', name: 'voyager' };
const NOW = new Date('2026-07-06T00:00:00.000Z');

function pr(number: number): PullRequest {
  return {
    number,
    repo: REPO,
    title: `PR ${number}`,
    state: 'OPEN',
    url: '',
    author: null,
    authorLogin: null,
    issueKey: 'ORB-1',
    headRefName: 'feature',
    baseRefName: 'main',
    stackParentKey: null,
    firstCommitAt: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    mergedAt: null,
    closedAt: null,
    updatedAt: null,
    reviewOutcomes: [],
    hasChangesRequested: false,
  };
}

/** A pending review request from `reviewer`, requested `requestedAt`. */
function pending(reviewerIndex: number, number: number, requestedAt: string): PendingReview {
  return {
    pr: pr(number),
    outcome: {
      reviewer: ROSTER[reviewerIndex],
      status: 'pending',
      requestedAt,
      respondedAt: null,
      reviewState: null,
    },
  };
}

describe('reviewRequestAgeDays', () => {
  it('counts whole days since the request, clamped at zero, zero when missing', () => {
    expect(reviewRequestAgeDays('2026-07-03T00:00:00.000Z', NOW)).toBe(3);
    expect(reviewRequestAgeDays('2026-07-06T06:00:00.000Z', NOW)).toBe(0);
    expect(reviewRequestAgeDays(null, NOW)).toBe(0);
  });
});

describe('reviewAgeLabel', () => {
  it('reads "today" on day zero, else "{n}d"', () => {
    expect(reviewAgeLabel(0)).toBe('today');
    expect(reviewAgeLabel(4)).toBe('4d');
  });
});

describe('buildReviewGroups', () => {
  it('groups by reviewer, oldest request first within a group and across groups', () => {
    const map = new Map<string, PendingReview[]>([
      [ROSTER[0].id, [pending(0, 501, '2026-07-05T00:00:00.000Z')]],
      [
        ROSTER[1].id,
        [pending(1, 502, '2026-07-04T00:00:00.000Z'), pending(1, 503, '2026-07-01T00:00:00.000Z')],
      ],
    ]);
    const groups = buildReviewGroups(map, null, NOW);
    // ROSTER[1] leads: its oldest request (Jul 1, 5d) is staler than ROSTER[0]'s (Jul 5, 1d).
    expect(groups.map((group) => group.person.id)).toEqual([ROSTER[1].id, ROSTER[0].id]);
    expect(groups[0].rows.map((row) => row.review.pr.number)).toEqual([503, 502]);
    expect(groups[0].oldestAgeDays).toBe(5);
    expect(groups[0].rows[0].stale).toBe(true);
  });

  it('keeps only the filtered reviewer when a person filter is set', () => {
    const map = new Map<string, PendingReview[]>([
      [ROSTER[0].id, [pending(0, 501, '2026-07-05T00:00:00.000Z')]],
      [ROSTER[1].id, [pending(1, 502, '2026-07-04T00:00:00.000Z')]],
    ]);
    const groups = buildReviewGroups(map, ROSTER[1].id, NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0].person.id).toBe(ROSTER[1].id);
  });

  it('drops reviewers with no waiting requests and totals the rest', () => {
    const map = new Map<string, PendingReview[]>([
      [ROSTER[0].id, []],
      [ROSTER[1].id, [pending(1, 502, '2026-07-04T00:00:00.000Z')]],
    ]);
    const groups = buildReviewGroups(map, null, NOW);
    expect(groups).toHaveLength(1);
    expect(totalWaiting(groups)).toBe(1);
  });
});
