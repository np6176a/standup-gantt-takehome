import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { TimeWindowControls } from '@/components/molecules/TimeWindowControls/TimeWindowControls';

const meta = {
  title: 'Molecules/TimeWindowControls',
  component: TimeWindowControls,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    zoom: 'month',
    onZoomChange: fn(),
    onPrev: fn(),
    onToday: fn(),
    onNext: fn(),
  },
} satisfies Meta<typeof TimeWindowControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Month: Story = {};

export const Week: Story = { args: { zoom: 'week' } };

export const Fortnight: Story = { args: { zoom: 'fortnight' } };

export const Year: Story = { args: { zoom: 'year' } };
