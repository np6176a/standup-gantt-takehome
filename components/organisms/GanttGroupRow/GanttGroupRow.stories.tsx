import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { GanttGroupRow } from '@/components/organisms/GanttGroupRow/GanttGroupRow';
import { buildLanes } from '@/lib/gantt/rows';
import { trackWidthPx } from '@/lib/gantt/density';
import type { Issue } from '@/lib/domain/types';
import { ROSTER } from '@/lib/domain/roster';
import { dayIndex, defaultWindowStart, windowDaysForZoom } from '@/lib/gantt/scale';

const today = dayIndex(new Date('2026-07-06T00:00:00.000Z'));
const windowStartIdx = defaultWindowStart(today, 'month');
const windowDays = windowDaysForZoom('month');

function issue(overrides: Partial<Issue> & { id: string }): Issue {
  return {
    identifier: `ORB-${overrides.id}`,
    title: overrides.id,
    url: '',
    stateName: 'In Progress',
    bucket: 'active',
    automationOwned: true,
    startedAt: '2026-07-02T00:00:00.000Z',
    dueDate: '2026-07-14',
    assignee: ROSTER[0],
    project: null,
    projectMilestone: null,
    ...overrides,
  };
}

const [lane] = buildLanes({
  issues: [
    issue({ id: '101', title: 'Refactor ingest pipeline', bucket: 'active', stateName: 'In Progress' }),
    issue({ id: '104', title: 'Wire telemetry', bucket: 'shipping', stateName: 'On Staging', startedAt: '2026-07-08T00:00:00.000Z', dueDate: '2026-07-16' }),
    issue({ id: '109', title: 'Migrate config', bucket: 'done', stateName: 'Done', startedAt: '2026-07-01T00:00:00.000Z', dueDate: '2026-07-05' }),
    issue({ id: '107', title: 'Spike caching', bucket: 'planned', stateName: 'Todo', startedAt: null, dueDate: null }),
  ],
  grouping: 'person',
  people: ROSTER,
  todayIdx: today,
});

const meta = {
  title: 'Organisms/GanttGroupRow',
  component: GanttGroupRow,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ overflowX: 'auto', width: 900 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    lane,
    zoom: 'month',
    windowStartIdx,
    windowDays,
    trackWidthPx: trackWidthPx('month', windowDays),
    todayIdx: today,
  },
} satisfies Meta<typeof GanttGroupRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
