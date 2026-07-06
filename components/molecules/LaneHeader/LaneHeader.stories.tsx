import type { Meta, StoryObj } from '@storybook/nextjs-vite';

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
  },
} satisfies Meta<typeof LaneHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Person: Story = {};

export const EmptyPerson: Story = { args: { person: ROSTER[1], title: ROSTER[1].displayName, issueCount: 0 } };

export const Project: Story = {
  args: { title: 'Atlas Export', person: null, issueCount: 7 },
};
