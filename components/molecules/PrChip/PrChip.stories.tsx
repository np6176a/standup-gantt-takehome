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
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', height: 20, width: 480, background: 'var(--color-surface)' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    pr: makePr(512),
    leftPct: 10,
    widthPct: 40,
    clippedLeft: false,
    clippedRight: false,
    mode: 'full',
    stacked: false,
    onSelect: fn(),
  },
} satisfies Meta<typeof PrChip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pending review — a hollow dot. */
export const Pending: Story = {};

/** Changes requested — a red ✗ (the loud one). */
export const ChangesRequested: Story = {
  args: { pr: makePr(503, { hasChangesRequested: true }) },
};

/** Approved and merged — a green ✓. */
export const Approved: Story = {
  args: {
    pr: makePr(509, {
      state: 'MERGED',
      mergedAt: '2026-07-05T12:00:00.000Z',
      reviewOutcomes: [{ ...pending, status: 'completed', reviewState: 'APPROVED', respondedAt: '2026-07-04T12:00:00.000Z' }],
    }),
  },
};

/** A stacked child PR renders indented with a dashed edge. */
export const StackedChild: Story = {
  args: { pr: makePr(508), stacked: true, leftPct: 20, widthPct: 30 },
};

/** Quarter zoom collapses the chip to just its review dot. */
export const DotMode: Story = {
  args: { mode: 'dot', pr: makePr(503, { hasChangesRequested: true }) },
};
