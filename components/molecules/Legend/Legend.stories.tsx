import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Legend } from '@/components/molecules/Legend/Legend';

const meta = {
  title: 'Molecules/Legend',
  component: Legend,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 720, padding: 12, background: 'var(--color-surface)' }}>
        <Story />
      </div>
    ),
  ],
  args: {},
} satisfies Meta<typeof Legend>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The bucket → raw-states mapping plus the blocked/overdue attention key. */
export const Default: Story = {};
