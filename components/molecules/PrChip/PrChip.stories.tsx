import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { PrChip } from '@/components/molecules/PrChip/PrChip';
import type { PullRequest } from '@/lib/normalize/pullRequests';
import type { ReviewOutcome } from '@/lib/normalize/reviews';
import type { RepoRef } from '@/lib/domain/types';
import { ROSTER } from '@/lib/domain/roster';

const REPO: RepoRef = { owner: 'orbital', name: 'voyager' };

const pending: ReviewOutcome = {
  reviewer: ROSTER[0],
  status: 'pending',
  requestedAt: '2026-07-01T12:00:00.000Z',
  respondedAt: null,
  reviewState: null,
};

function makePr(number: number, over: Partial<PullRequest> = {}): PullRequest {
  return {
    number,
    repo: REPO,
    title: `Change ${number}`,
    state: 'OPEN',
    url: `https://github.com/pr/${number}`,
    author: ROSTER[0],
    authorLogin: ROSTER[0].githubLogin,
    issueKey: 'ORB-105',
    headRefName: `feature/${number}`,
    baseRefName: 'main',
    stackParentKey: null,
    firstCommitAt: '2026-07-02T12:00:00.000Z',
    createdAt: '2026-07-02T12:00:00.000Z',
    mergedAt: null,
    closedAt: null,
    updatedAt: '2026-07-02T12:00:00.000Z',
    reviewOutcomes: [pending],
    hasChangesRequested: false,
    ...over,
  };
}

const meta = {
  title: 'Molecules/PrChip',
  component: PrChip,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    pr: makePr(512),
    stacked: false,
    showAuthor: false,
    onSelect: fn(),
  },
} satisfies Meta<typeof PrChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {};

export const ChangesRequested: Story = {
  args: { pr: makePr(503, { hasChangesRequested: true }) },
};

export const Approved: Story = {
  args: {
    pr: makePr(509, {
      state: 'MERGED',
      mergedAt: '2026-07-05T12:00:00.000Z',
      reviewOutcomes: [{ ...pending, status: 'completed', reviewState: 'APPROVED', respondedAt: '2026-07-04T12:00:00.000Z' }],
    }),
  },
};

export const StackedChild: Story = {
  args: { pr: makePr(508), stacked: true },
};
