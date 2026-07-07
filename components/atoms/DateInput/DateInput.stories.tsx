import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { DateInput } from './DateInput';

const meta = {
  title: 'Atoms/DateInput',
  component: DateInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    onChange: fn(),
    className: 'w-56',
  },
} satisfies Meta<typeof DateInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithValue: Story = {
  args: {
    value: '2026-07-06',
    'aria-label': 'Due date',
  },
};

export const Empty: Story = {
  args: {
    value: null,
    'aria-label': 'Due date',
  },
};

export const NotClearable: Story = {
  args: {
    value: '2026-07-06',
    clearable: false,
    'aria-label': 'Planned start',
  },
};

export const Disabled: Story = {
  args: {
    value: '2026-07-06',
    disabled: true,
    'aria-label': 'Due date',
  },
};
