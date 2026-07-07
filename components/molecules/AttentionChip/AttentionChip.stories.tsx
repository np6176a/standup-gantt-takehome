import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { AttentionChip } from '@/components/molecules/AttentionChip/AttentionChip';

const meta = {
  title: 'Molecules/AttentionChip',
  component: AttentionChip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    blocked: 2,
    overdue: 1,
    active: false,
    onToggle: fn(),
  },
} satisfies Meta<typeof AttentionChip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Blocked and overdue items on the board — the chip is loud. */
export const HasAttention: Story = {};

/** The chip while it's actively filtering the board to attention items. */
export const Active: Story = { args: { active: true } };

/** Nothing blocked or overdue — the calm "All clear" state. */
export const AllClear: Story = { args: { blocked: 0, overdue: 0 } };
