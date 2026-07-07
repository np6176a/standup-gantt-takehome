import {
  NO_PROJECT_KEY,
  UNASSIGNED_KEY,
  buildLanes,
  type Lane,
} from '@/lib/gantt/rows';
import type { Bucket } from '@/lib/domain/states';
import type { Issue, Person } from '@/lib/domain/types';
import { ROSTER } from '@/lib/domain/roster';
import { dayIndex } from '@/lib/gantt/scale';

const TODAY = dayIndex(new Date('2026-07-06T00:00:00.000Z'));
const iso = (day: string) => `${day}T00:00:00.000Z`;

/** Build a minimal issue for grouping/packing tests; only the fields under test matter. */
function makeIssue(overrides: Partial<Issue> & { id: string }): Issue {
  return {
    identifier: `ORB-${overrides.id}`,
    title: `Issue ${overrides.id}`,
    url: `https://linear.app/${overrides.id}`,
    stateName: 'In Progress',
    bucket: 'active',
    automationOwned: true,
    startedAt: iso('2026-07-01'),
    dueDate: '2026-07-10',
    assignee: null,
    project: null,
    projectMilestone: null,
    ...overrides,
  };
}

const priya = ROSTER[0];
const marcus = ROSTER[1];
const laneByKey = (lanes: Lane[], key: string) => lanes.find((lane) => lane.key === key)!;

describe('buildLanes — person grouping', () => {
  it('emits a lane for every roster person, in roster order, even when empty', () => {
    const lanes = buildLanes({ issues: [], grouping: 'person', people: ROSTER, todayIdx: TODAY });
    expect(lanes.map((lane) => lane.key)).toEqual(ROSTER.map((person) => person.id));
    expect(lanes.every((lane) => lane.rows.length === 0)).toBe(true);
  });

  it('places each issue in its assignee lane with the person attached', () => {
    const lanes = buildLanes({
      issues: [makeIssue({ id: '1', assignee: priya })],
      grouping: 'person',
      people: ROSTER,
      todayIdx: TODAY,
    });
    const lane = laneByKey(lanes, priya.id);
    expect(lane.person).toEqual(priya);
    expect(lane.rows.flat().map((member) => member.issue.id)).toEqual(['1']);
  });

  it('appends an Unassigned lane last, only when issues lack an assignee', () => {
    const withAssignee = buildLanes({
      issues: [makeIssue({ id: '1', assignee: priya })],
      grouping: 'person',
      people: ROSTER,
      todayIdx: TODAY,
    });
    expect(withAssignee.some((lane) => lane.key === UNASSIGNED_KEY)).toBe(false);

    const withUnassigned = buildLanes({
      issues: [makeIssue({ id: '2', assignee: null })],
      grouping: 'person',
      people: ROSTER,
      todayIdx: TODAY,
    });
    expect(withUnassigned[withUnassigned.length - 1].key).toBe(UNASSIGNED_KEY);
  });

  it('appends an off-roster assignee lane before Unassigned', () => {
    const outsider: Person = {
      id: 'usr_outsider',
      name: 'Outsider',
      displayName: 'outsider',
      email: 'out@x.dev',
      githubLogin: '',
    };
    const lanes = buildLanes({
      issues: [makeIssue({ id: '1', assignee: outsider }), makeIssue({ id: '2', assignee: null })],
      grouping: 'person',
      people: ROSTER,
      todayIdx: TODAY,
    });
    const keys = lanes.map((lane) => lane.key);
    expect(keys.indexOf('usr_outsider')).toBeLessThan(keys.indexOf(UNASSIGNED_KEY));
  });
});

describe('buildLanes — project grouping', () => {
  it('emits a lane per project alphabetically, with No project last', () => {
    const lanes = buildLanes({
      issues: [
        makeIssue({ id: '1', project: { id: 'p_z', name: 'Zephyr' } }),
        makeIssue({ id: '2', project: { id: 'p_a', name: 'Atlas' } }),
        makeIssue({ id: '3', project: null }),
      ],
      grouping: 'project',
      people: ROSTER,
      todayIdx: TODAY,
    });
    expect(lanes.map((lane) => lane.title)).toEqual(['Atlas', 'Zephyr', 'No project']);
    expect(lanes[lanes.length - 1].key).toBe(NO_PROJECT_KEY);
  });

  it('omits projects with no issues (unlike person mode, which shows everyone)', () => {
    const lanes = buildLanes({
      issues: [makeIssue({ id: '1', project: { id: 'p_a', name: 'Atlas' } })],
      grouping: 'project',
      people: ROSTER,
      todayIdx: TODAY,
    });
    expect(lanes).toHaveLength(1);
    expect(lanes[0].title).toBe('Atlas');
  });
});

describe('buildLanes — sorting and packing', () => {
  it('sorts a lane by status bucket (active before done)', () => {
    const buckets: Array<[string, Bucket]> = [
      ['done', 'done'],
      ['active', 'active'],
    ];
    const lanes = buildLanes({
      issues: buckets.map(([id, bucket]) =>
        makeIssue({ id, bucket, assignee: priya, dueDate: '2026-07-10', startedAt: iso('2026-07-01') }),
      ),
      grouping: 'person',
      people: ROSTER,
      todayIdx: TODAY,
    });
    // Both overlap the same span, so they pack into two rows preserving bucket order.
    const lane = laneByKey(lanes, priya.id);
    expect(lane.rows.map((row) => row[0].issue.id)).toEqual(['active', 'done']);
  });

  it('packs non-overlapping issues onto the same row', () => {
    const lanes = buildLanes({
      issues: [
        makeIssue({ id: 'early', assignee: marcus, startedAt: iso('2026-07-01'), dueDate: '2026-07-03' }),
        makeIssue({ id: 'late', assignee: marcus, startedAt: iso('2026-07-05'), dueDate: '2026-07-08' }),
      ],
      grouping: 'person',
      people: ROSTER,
      todayIdx: TODAY,
    });
    const lane = laneByKey(lanes, marcus.id);
    expect(lane.rows).toHaveLength(1);
    expect(lane.rows[0].map((member) => member.issue.id)).toEqual(['early', 'late']);
  });

  it('routes no-date issues to the unscheduled shelf, not a row', () => {
    const lanes = buildLanes({
      issues: [makeIssue({ id: 'floating', assignee: priya, startedAt: null, dueDate: null })],
      grouping: 'person',
      people: ROSTER,
      todayIdx: TODAY,
    });
    const lane = laneByKey(lanes, priya.id);
    expect(lane.rows).toHaveLength(0);
    expect(lane.unscheduled.map((member) => member.issue.id)).toEqual(['floating']);
  });
});
