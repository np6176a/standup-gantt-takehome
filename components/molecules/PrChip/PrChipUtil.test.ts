import {
  prChipInterval,
  prChipLabel,
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
  it('runs first-commit → merged when merged', () => {
    const interval = prChipInterval(makePr({ number: 1, mergedAt: iso('2026-07-04') }), TODAY);
    expect(interval).toEqual({
      start: dayIndex(new Date(iso('2026-07-02'))),
      end: dayIndex(new Date(iso('2026-07-04'))),
    });
  });

  it('runs an open PR to today', () => {
    const interval = prChipInterval(makePr({ number: 2 }), TODAY);
    expect(interval).toEqual({ start: dayIndex(new Date(iso('2026-07-02'))), end: TODAY });
  });

  it('clamps end ≥ start for a same-day PR', () => {
    const interval = prChipInterval(
      makePr({ number: 3, firstCommitAt: iso('2026-07-06'), mergedAt: iso('2026-07-06') }),
      TODAY,
    );
    expect(interval!.end).toBeGreaterThanOrEqual(interval!.start);
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
