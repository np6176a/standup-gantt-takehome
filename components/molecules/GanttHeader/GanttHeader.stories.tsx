import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { GanttHeader } from '@/components/molecules/GanttHeader/GanttHeader';
import { dayIndex, defaultWindowStart, windowDaysForZoom } from '@/lib/gantt/scale';

const today = dayIndex(new Date('2026-07-06T00:00:00.000Z'));

const meta = {
  title: 'Molecules/GanttHeader',
  component: GanttHeader,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 900, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    zoom: 'month',
    windowStartIdx: defaultWindowStart(today, 'month'),
    windowDays: windowDaysForZoom('month'),
  },
} satisfies Meta<typeof GanttHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Month: Story = {};

export const Week: Story = {
  args: {
    zoom: 'week',
    windowStartIdx: defaultWindowStart(today, 'week'),
    windowDays: windowDaysForZoom('week'),
  },
};

export const Quarter: Story = {
  args: {
    zoom: 'quarter',
    windowStartIdx: defaultWindowStart(today, 'quarter'),
    windowDays: windowDaysForZoom('quarter'),
  },
};

export const Year: Story = {
  args: {
    zoom: 'year',
    windowStartIdx: defaultWindowStart(today, 'year'),
    windowDays: windowDaysForZoom('year'),
  },
};
