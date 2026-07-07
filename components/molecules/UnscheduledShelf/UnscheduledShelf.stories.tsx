import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { UnscheduledShelf } from '@/components/molecules/UnscheduledShelf/UnscheduledShelf';
import type { Bucket } from '@/lib/domain/states';
import type { Issue } from '@/lib/domain/types';

function makeIssue(id: string, title: string, bucket: Bucket, stateName: string): Issue {
  return {
    id,
    identifier: id,
    title,
    url: `https://linear.app/${id}`,
    stateName,
    bucket,
    automationOwned: false,
    startedAt: null,
    dueDate: null,
    assignee: null,
    project: null,
    projectMilestone: null,
  };
}

const meta = {
  title: 'Molecules/UnscheduledShelf',
  component: UnscheduledShelf,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: 34, width: 600, border: '1px solid var(--color-border)' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    issues: [
      makeIssue('ORB-107', 'Spike caching strategy', 'planned', 'Todo'),
      makeIssue('ORB-122', 'Draft rollout plan', 'planned', 'Backlog'),
    ],
    onSelectIssue: fn(),
  },
} satisfies Meta<typeof UnscheduledShelf>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Empty shelf renders nothing. */
export const Empty: Story = { args: { issues: [] } };
