import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Avatar } from '@/components/atoms/Avatar/Avatar';

const meta = {
  title: 'Atoms/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    name: 'Priya Nadkarni',
    size: 'md',
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg', name: 'Marcus Webb' } };

/** Each teammate gets a stable, distinct color derived from their name. */
export const Team: Story = {
  render: () => (
    <div className="flex gap-2">
      {['Priya Nadkarni', 'Marcus Webb', 'Dana Cho', 'Theo Ramos', 'Ingrid Olsen', 'Sam Okafor'].map(
        (name) => (
          <Avatar key={name} name={name} />
        ),
      )}
    </div>
  ),
};
