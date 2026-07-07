import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { StateFilterPopover } from '@/components/molecules/StateFilterPopover/StateFilterPopover';
import { defaultVisibleStates } from '@/stores/uiStore';

/** Representative live counts across the seed's states. */
const COUNTS: Record<string, number> = {
  'In Progress': 5,
  'Design Exploration': 1,
  'On Develop': 2,
  'In Review': 4,
  'On Staging': 1,
  'On Prod': 3,
  Todo: 2,
  'Selected For Development': 6,
  Backlog: 3,
  Triage: 1,
  Done: 8,
  Canceled: 2,
};

/** A stateful wrapper so the checkboxes toggle live in Storybook. */
const StatefulPopover = () => {
  const [visibleStates, setVisibleStates] = useState<Record<string, boolean>>(
    defaultVisibleStates(),
  );
  const hiddenCount = Object.values(visibleStates).filter((visible) => visible === false).length;

  return (
    <div className="flex h-96 items-start p-6">
      <StateFilterPopover
        counts={COUNTS}
        visibleStates={visibleStates}
        hiddenCount={hiddenCount}
        onSetStatesVisible={(names, visible) =>
          setVisibleStates((current) => {
            const next = { ...current };
            for (const name of names) next[name] = visible;
            return next;
          })
        }
        onReset={() => setVisibleStates(defaultVisibleStates())}
      />
    </div>
  );
};

const meta = {
  title: 'Molecules/StateFilterPopover',
  component: StateFilterPopover,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    counts: COUNTS,
    visibleStates: defaultVisibleStates(),
    hiddenCount: 3,
    onSetStatesVisible: fn(),
    onReset: fn(),
  },
} satisfies Meta<typeof StateFilterPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Interactive: open the popover and toggle states / buckets. */
export const Interactive: Story = {
  render: () => <StatefulPopover />,
};

/** Default filter: three states hidden, so the button carries a "3 hidden" badge. */
export const DefaultsHidden: Story = {};

/** All states visible — the button reads as inactive with no badge. */
export const AllVisible: Story = {
  args: {
    visibleStates: {},
    hiddenCount: 0,
  },
};
