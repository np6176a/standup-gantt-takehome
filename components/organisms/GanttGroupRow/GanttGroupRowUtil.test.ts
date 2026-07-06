import { placeRow } from '@/components/organisms/GanttGroupRow/GanttGroupRowUtil';
import type { PositionedIssue } from '@/lib/gantt/rows';
import type { Issue } from '@/lib/domain/types';
import { computeSpan } from '@/lib/normalize/issues';
import { dayIndex } from '@/lib/gantt/scale';
import { trackWidthPx } from '@/lib/gantt/density';

const START = dayIndex(new Date('2026-07-06T00:00:00.000Z'));
const WINDOW_DAYS = 14;
const TRACK = trackWidthPx('month', WINDOW_DAYS);

function member(overrides: Partial<Issue> & { id: string }): PositionedIssue {
  const issue: Issue = {
    identifier: `ORB-${overrides.id}`,
    title: overrides.id,
    url: '',
    stateName: 'In Progress',
    bucket: 'active',
    automationOwned: true,
    startedAt: null,
    dueDate: null,
    assignee: null,
    project: null,
    projectMilestone: null,
    ...overrides,
  };
  const span = computeSpan({
    plannedStart: null,
    startedAt: issue.startedAt,
    dueDate: issue.dueDate,
    todayIdx: START + 3,
  });
  return { issue, span };
}

describe('placeRow', () => {
  it('places an in-window bar with a positive pixel width', () => {
    const placed = placeRow(
      [member({ id: '1', startedAt: '2026-07-07T00:00:00.000Z', dueDate: '2026-07-12' })],
      START,
      WINDOW_DAYS,
      TRACK,
    );
    expect(placed).toHaveLength(1);
    expect(placed[0].barWidthPx).toBeGreaterThan(0);
    expect(placed[0].isMarker).toBe(false);
  });

  it('marks a due-only issue as a marker', () => {
    const placed = placeRow([member({ id: '2', dueDate: '2026-07-10' })], START, WINDOW_DAYS, TRACK);
    expect(placed[0].isMarker).toBe(true);
    expect(placed[0].widthPct).toBe(0);
  });

  it('drops a span entirely outside the window', () => {
    const placed = placeRow(
      [member({ id: '3', startedAt: '2026-01-01T00:00:00.000Z', dueDate: '2026-01-05' })],
      START,
      WINDOW_DAYS,
      TRACK,
    );
    expect(placed).toHaveLength(0);
  });

  it('flags a bar clipped at the left window edge', () => {
    const placed = placeRow(
      [member({ id: '4', startedAt: '2026-06-01T00:00:00.000Z', dueDate: '2026-07-12' })],
      START,
      WINDOW_DAYS,
      TRACK,
    );
    expect(placed[0].clippedLeft).toBe(true);
    expect(placed[0].leftPct).toBe(0);
  });
});
