import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { Select } from './Select';

const meta = {
  title: 'Atoms/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    onChange: fn(),
    className: 'w-56',
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

const STATE_OPTIONS = [
  { value: 'Todo', label: 'Todo' },
  { value: 'Selected For Development', label: 'Selected For Development' },
  { value: 'In Progress', label: 'In Progress (set by automation)', disabled: true },
  { value: 'Done', label: 'Done' },
];

export const Default: Story = {
  args: {
    value: 'Selected For Development',
    options: STATE_OPTIONS,
    'aria-label': 'Status',
  },
};

export const WithLockedOption: Story = {
  args: {
    value: 'In Progress',
    options: STATE_OPTIONS,
    'aria-label': 'Status (automation-owned selected)',
  },
};

export const Disabled: Story = {
  args: {
    value: 'Todo',
    options: STATE_OPTIONS,
    disabled: true,
    'aria-label': 'Status',
  },
};
