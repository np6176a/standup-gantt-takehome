import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { LaneHeader } from '@/components/molecules/LaneHeader/LaneHeader';
import { ROSTER } from '@/lib/domain/roster';

const meta = {
  title: 'Molecules/LaneHeader',
  component: LaneHeader,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 220, height: 60, border: '1px solid var(--color-border)' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    title: ROSTER[0].displayName,
    person: ROSTER[0],
    issueCount: 3,
    summary: { blocked: 0, overdue: 0, active: 0, inReview: 0, reviewsWaiting: 0 },
    onReviewsClick: fn(),
  },
} satisfies Meta<typeof LaneHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A quiet lane falls back to the plain issue-count summary. */
export const Person: Story = {};

export const EmptyPerson: Story = {
  args: { person: ROSTER[1], title: ROSTER[1].displayName, issueCount: 0 },
};

/** The full badge cluster — the standup readout that needs no bars. */
export const WithBadgeCluster: Story = {
  args: {
    summary: { blocked: 1, overdue: 1, active: 2, inReview: 1, reviewsWaiting: 3 },
  },
};

/** Attention only: blocked + overdue lead the cluster. */
export const Attention: Story = {
  args: {
    summary: { blocked: 2, overdue: 1, active: 0, inReview: 0, reviewsWaiting: 0 },
  },
};

export const Project: Story = {
  args: { title: 'Atlas Export', person: null, issueCount: 7 },
};
