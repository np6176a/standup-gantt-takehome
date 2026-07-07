import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { GroupingToggle } from '@/components/molecules/GroupingToggle/GroupingToggle';

const meta = {
  title: 'Molecules/GroupingToggle',
  component: GroupingToggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    grouping: 'person',
    onChange: fn(),
  },
} satisfies Meta<typeof GroupingToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const People: Story = {};

export const Projects: Story = { args: { grouping: 'project' } };
