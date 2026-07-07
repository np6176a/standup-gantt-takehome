import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

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
      <div style={{ maxWidth: 1200, padding: 12, background: 'var(--color-surface)' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    open: true,
    onToggle: fn(),
  },
} satisfies Meta<typeof Legend>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Collapsed: Story = {
  args: { open: false },
};
