import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { TodayLine } from '@/components/molecules/TodayLine/TodayLine';

const meta = {
  title: 'Molecules/TodayLine',
  component: TodayLine,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', height: 160, width: 700, background: 'var(--color-surface)' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    leftPct: 33,
    visible: true,
    label: 'Jul 6',
  },
} satisfies Meta<typeof TodayLine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Off-window today renders nothing. */
export const Hidden: Story = { args: { visible: false } };
