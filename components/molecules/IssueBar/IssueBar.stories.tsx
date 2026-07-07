import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { IssueBar } from '@/components/molecules/IssueBar/IssueBar';
import type { Bucket } from '@/lib/domain/states';
import type { Issue } from '@/lib/domain/types';
import type { DerivedAttention } from '@/lib/normalize/attention';
import { dayIndex } from '@/lib/gantt/scale';

const TODAY_IDX = dayIndex(new Date('2026-07-06T00:00:00.000Z'));

const blocked = (reason: string): DerivedAttention => ({
  overdue: false,
  blockedDerived: true,
  blockedReason: reason,
});

const overdue: DerivedAttention = { overdue: true, blockedDerived: false, blockedReason: null };

function makeIssue(
  bucket: Bucket,
  stateName: string,
  id: string,
  title: string,
  dueDate: string | null = null,
): Issue {
  return {
    id,
    identifier: id,
    title,
    url: `https://linear.app/${id}`,
    stateName,
    bucket,
    automationOwned: false,
    startedAt: null,
    dueDate,
    assignee: null,
    project: null,
    projectMilestone: null,
  };
}

const meta = {
  title: 'Molecules/IssueBar',
  component: IssueBar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', height: 30, width: 640, background: 'var(--color-surface)' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    issue: makeIssue('active', 'In Progress', 'ORB-101', 'Refactor ingest pipeline'),
    leftPct: 10,
    widthPct: 45,
    barWidthPx: 288,
    isMarker: false,
    clippedLeft: false,
    clippedRight: false,
    zoom: 'month',
    attention: { overdue: false, blockedDerived: false, blockedReason: null },
    todayIdx: TODAY_IDX,
  },
} satisfies Meta<typeof IssueBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {};

export const InReview: Story = {
  args: { issue: makeIssue('review', 'In Review', 'ORB-105', 'Auth token rotation') },
};

export const Shipping: Story = {
  args: { issue: makeIssue('shipping', 'On Staging', 'ORB-104', 'Wire telemetry') },
};

export const Planned: Story = {
  args: { issue: makeIssue('planned', 'Selected For Development', 'ORB-110', 'Export CSV') },
};

export const Done: Story = {
  args: { issue: makeIssue('done', 'Done', 'ORB-109', 'Migrate config') },
};

export const Dropped: Story = {
  args: { issue: makeIssue('dropped', 'Canceled', 'ORB-108', 'Legacy webhook') },
};

/** A due-only issue collapses to a diamond marker at its due date. */
export const Marker: Story = {
  args: {
    issue: makeIssue('planned', 'Todo', 'ORB-107', 'Spike caching'),
    leftPct: 40,
    widthPct: 0,
    barWidthPx: 0,
    isMarker: true,
  },
};

/** A long-running bar clipped at both window edges squares off its corners. */
export const ClippedBothEdges: Story = {
  args: {
    issue: makeIssue('active', 'In Progress', 'ORB-106', 'Long-running migration'),
    leftPct: 0,
    widthPct: 100,
    barWidthPx: 640,
    clippedLeft: true,
    clippedRight: true,
  },
};

/** Blocked: red ring + thick red left edge + ⛔ (the loud standup signal). */
export const Blocked: Story = {
  args: {
    issue: makeIssue('review', 'In Review', 'ORB-503', 'Payments webhook'),
    attention: blocked('changes requested on #503'),
  },
};

/** Overdue: red diagonal hatch + a clock badge counting days past the due date. */
export const Overdue: Story = {
  args: {
    issue: makeIssue('active', 'In Progress', 'ORB-112', 'Backfill nightly job', '2026-07-01'),
    attention: overdue,
  },
};

/** Both at once — blocked ring wins the color; the overdue hatch + badge still layer on. */
export const BlockedAndOverdue: Story = {
  args: {
    issue: makeIssue('active', 'In Progress', 'ORB-118', 'Region failover', '2026-06-28'),
    attention: { overdue: true, blockedDerived: true, blockedReason: 'changes requested on #530' },
  },
};
