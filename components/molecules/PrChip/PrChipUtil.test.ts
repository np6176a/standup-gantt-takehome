import {
  groupPrsByOwnership,
  isExternalAuthor,
  prChipInterval,
  prChipLabel,
  prChipTooltip,
  reviewDetailLabel,
  reviewDotState,
} from '@/components/molecules/PrChip/PrChipUtil';
import type { PullRequest } from '@/lib/normalize/pullRequests';
import type { ReviewOutcome } from '@/lib/normalize/reviews';
import type { RepoRef } from '@/lib/domain/types';
import { ROSTER } from '@/lib/domain/roster';
import { dayIndex } from '@/lib/gantt/scale';

const REPO: RepoRef = { owner: 'orbital', name: 'voyager' };
const iso = (day: string) => `${day}T12:00:00.000Z`;
const TODAY = dayIndex(new Date('2026-07-06T00:00:00.000Z'));

const outcome = (over: Partial<ReviewOutcome>): ReviewOutcome => ({
  reviewer: ROSTER[0],
  status: 'pending',
  requestedAt: iso('2026-07-01'),
  respondedAt: null,
  reviewState: null,
  ...over,
});

function makePr(over: Partial<PullRequest> & { number: number }): PullRequest {
  return {
    repo: REPO,
    title: `PR ${over.number}`,
    state: 'OPEN',
    url: `https://github.com/pr/${over.number}`,
    author: null,
    authorLogin: null,
    issueKey: 'ORB-105',
    headRefName: 'feature',
    baseRefName: 'main',
    stackParentKey: null,
    firstCommitAt: iso('2026-07-02'),
    createdAt: iso('2026-07-02'),
    mergedAt: null,
    closedAt: null,
    updatedAt: iso('2026-07-02'),
    reviewOutcomes: [],
    hasChangesRequested: false,
    ...over,
  };
}

describe('reviewDotState', () => {
  it('escalates changes-requested above pending above approved', () => {
    expect(reviewDotState(makePr({ number: 1, hasChangesRequested: true }))).toBe('changes');
    expect(reviewDotState(makePr({ number: 2, reviewOutcomes: [outcome({ status: 'pending' })] }))).toBe(
      'pending',
    );
    expect(
      reviewDotState(
        makePr({
          number: 3,
          reviewOutcomes: [outcome({ status: 'completed', reviewState: 'APPROVED' })],
        }),
      ),
    ).toBe('approved');
    expect(reviewDotState(makePr({ number: 4 }))).toBe('none');
  });
});

describe('prChipInterval', () => {
  it('runs first-commit → merged+1 (exclusive end) when merged', () => {
    const interval = prChipInterval(makePr({ number: 1, mergedAt: iso('2026-07-04') }), TODAY);
    expect(interval).toEqual({
      start: dayIndex(new Date(iso('2026-07-02'))),
      end: dayIndex(new Date(iso('2026-07-04'))) + 1,
    });
  });

  it('runs an open PR to today+1 (exclusive)', () => {
    const interval = prChipInterval(makePr({ number: 2 }), TODAY);
    expect(interval).toEqual({ start: dayIndex(new Date(iso('2026-07-02'))), end: TODAY + 1 });
  });

  it('gives a same-day PR at least one day of width', () => {
    const interval = prChipInterval(
      makePr({ number: 3, firstCommitAt: iso('2026-07-06'), mergedAt: iso('2026-07-06') }),
      TODAY,
    );
    expect(interval!.end - interval!.start).toBeGreaterThanOrEqual(1);
  });

  it('falls back to createdAt when there is no first commit', () => {
    const interval = prChipInterval(
      makePr({ number: 4, firstCommitAt: null, createdAt: iso('2026-07-03') }),
      TODAY,
    );
    expect(interval!.start).toBe(dayIndex(new Date(iso('2026-07-03'))));
  });
});

describe('prChipLabel', () => {
  it('is the PR number', () => {
    expect(prChipLabel(makePr({ number: 512 }))).toBe('#512');
  });
});

describe('prChipTooltip', () => {
  it('includes number, title, author, and review state', () => {
    const tip = prChipTooltip(makePr({ number: 503, hasChangesRequested: true }));
    expect(tip).toContain('#503');
    expect(tip).toContain('changes requested');
  });
});

describe('isExternalAuthor', () => {
  it('returns true when PR author differs from the assignee', () => {
    expect(isExternalAuthor(makePr({ number: 1, authorLogin: 'alice' }), 'bob')).toBe(true);
    expect(isExternalAuthor(makePr({ number: 2, authorLogin: 'alice' }), 'alice')).toBe(false);
  });

  it('returns false when assignee is null', () => {
    expect(isExternalAuthor(makePr({ number: 3, authorLogin: 'alice' }), null)).toBe(false);
  });
});

describe('groupPrsByOwnership', () => {
  it('separates owner PRs from external PRs', () => {
    const prs = [
      makePr({ number: 1, authorLogin: 'alice' }),
      makePr({ number: 2, authorLogin: 'bob' }),
      makePr({ number: 3, authorLogin: 'alice' }),
    ];
    const [owner, external] = groupPrsByOwnership(prs, 'alice');
    expect(owner.map((pr) => pr.number)).toEqual([1, 3]);
    expect(external.map((pr) => pr.number)).toEqual([2]);
  });
});

describe('reviewDetailLabel', () => {
  const now = new Date('2026-07-06T12:00:00.000Z');

  it('returns "approved" for an approved PR', () => {
    expect(
      reviewDetailLabel(
        makePr({
          number: 1,
          reviewOutcomes: [outcome({ status: 'completed', reviewState: 'APPROVED', respondedAt: iso('2026-07-04') })],
        }),
        now,
      ),
    ).toBe('approved');
  });

  it('returns "changes requested" with days for a changes-requested PR', () => {
    const label = reviewDetailLabel(
      makePr({
        number: 2,
        hasChangesRequested: true,
        reviewOutcomes: [outcome({ status: 'completed', reviewState: 'CHANGES_REQUESTED', respondedAt: iso('2026-07-03') })],
      }),
      now,
    );
    expect(label).toMatch(/^changes requested \d+d$/);
  });

  it('shows reviewer display name when exactly one review is pending', () => {
    const label = reviewDetailLabel(
      makePr({
        number: 3,
        reviewOutcomes: [outcome({ status: 'pending', requestedAt: iso('2026-07-04') })],
      }),
      now,
    );
    expect(label).toContain(ROSTER[0].displayName);
  });

  it('shows "review pending" with days when multiple reviews are pending', () => {
    const label = reviewDetailLabel(
      makePr({
        number: 4,
        reviewOutcomes: [
          outcome({ reviewer: ROSTER[0], status: 'pending', requestedAt: iso('2026-07-01') }),
          outcome({ reviewer: ROSTER[1], status: 'pending', requestedAt: iso('2026-07-03') }),
        ],
      }),
      now,
    );
    expect(label).toMatch(/^review pending \d+d$/);
    expect(label).not.toContain(ROSTER[0].displayName);
  });

  it('does not show reviewer name when changes are also requested', () => {
    const label = reviewDetailLabel(
      makePr({
        number: 5,
        hasChangesRequested: true,
        reviewOutcomes: [
          outcome({ status: 'completed', reviewState: 'CHANGES_REQUESTED', respondedAt: iso('2026-07-03') }),
        ],
      }),
      now,
    );
    expect(label).not.toContain(ROSTER[0].displayName);
  });

  it('returns empty string for no review state', () => {
    expect(reviewDetailLabel(makePr({ number: 6 }), now)).toBe('');
  });
});
