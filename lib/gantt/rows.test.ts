import {
  NO_PROJECT_KEY,
  UNASSIGNED_KEY,
  buildLanes,
  earliestPrDate,
  matchesSearch,
  type Lane,
  type PositionedIssue,
} from '@/lib/gantt/rows';
import type { Bucket } from '@/lib/domain/states';
import type { Issue, Person, RepoRef } from '@/lib/domain/types';
import type { PullRequest } from '@/lib/normalize/pullRequests';
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

const REPO: RepoRef = { owner: 'orbital', name: 'voyager' };

/** A minimal PR carrying only the fields attention derivation reads. */
function makePr(overrides: Partial<PullRequest> & { number: number }): PullRequest {
  return {
    repo: REPO,
    title: `PR ${overrides.number}`,
    state: 'OPEN',
    url: `https://github.com/pr/${overrides.number}`,
    author: null,
    authorLogin: null,
    issueKey: null,
    headRefName: 'feature',
    baseRefName: 'main',
    stackParentKey: null,
    firstCommitAt: iso('2026-07-01'),
    createdAt: iso('2026-07-01'),
    mergedAt: null,
    closedAt: null,
    updatedAt: iso('2026-07-01'),
    reviewOutcomes: [],
    hasChangesRequested: false,
    ...overrides,
  };
}

describe('buildLanes — attention enrichment', () => {
  it('floats blocked above overdue above the bucket order', () => {
    const issues = [
      makeIssue({ id: 'plain', assignee: priya, bucket: 'active', dueDate: '2026-07-20' }),
      makeIssue({ id: 'overdue', assignee: priya, bucket: 'active', startedAt: iso('2026-07-02'), dueDate: '2026-07-05' }),
      makeIssue({ id: 'blocked', assignee: priya, bucket: 'active', dueDate: '2026-07-20' }),
    ];
    const prsByIssueId = new Map<string, PullRequest[]>([
      ['blocked', [makePr({ number: 1, state: 'OPEN', hasChangesRequested: true })]],
    ]);
    const lanes = buildLanes({
      issues,
      grouping: 'person',
      people: ROSTER,
      todayIdx: TODAY,
      prsByIssueId,
    });
    const lane = laneByKey(lanes, priya.id);
    // All three overlap → one issue per packed row, ordered blocked → overdue → plain.
    expect(lane.rows.map((row) => row[0].issue.id)).toEqual(['blocked', 'overdue', 'plain']);
  });

  it('tallies the lane badge summary and reviews-waiting from its person key', () => {
    const issues = [
      makeIssue({ id: 'a', assignee: priya, bucket: 'active', dueDate: '2026-07-01' }),
      makeIssue({ id: 'b', assignee: priya, bucket: 'review', dueDate: '2026-07-20' }),
    ];
    const prsByIssueId = new Map<string, PullRequest[]>([
      ['b', [makePr({ number: 2, state: 'OPEN', hasChangesRequested: true })]],
    ]);
    const lanes = buildLanes({
      issues,
      grouping: 'person',
      people: ROSTER,
      todayIdx: TODAY,
      prsByIssueId,
      reviewsWaitingByPersonId: new Map([[priya.id, 3]]),
    });
    const { summary } = laneByKey(lanes, priya.id);
    expect(summary).toEqual({
      blocked: 1,
      overdue: 1,
      active: 1,
      inReview: 1,
      reviewsWaiting: 3,
    });
  });

  it('does not attach reviews-waiting to project-mode lanes', () => {
    const lanes = buildLanes({
      issues: [makeIssue({ id: '1', project: { id: 'p_a', name: 'Atlas' } })],
      grouping: 'project',
      people: ROSTER,
      todayIdx: TODAY,
      reviewsWaitingByPersonId: new Map([['p_a', 5]]),
    });
    expect(lanes[0].summary.reviewsWaiting).toBe(0);
  });
});

describe('earliestPrDate', () => {
  it('returns the earliest createdAt across PRs', () => {
    expect(earliestPrDate([
      makePr({ number: 1, createdAt: iso('2026-07-05') }),
      makePr({ number: 2, createdAt: iso('2026-07-02') }),
      makePr({ number: 3, createdAt: iso('2026-07-04') }),
    ])).toBe(iso('2026-07-02'));
  });

  it('returns null when no PRs have a createdAt', () => {
    expect(earliestPrDate([makePr({ number: 1, createdAt: null as unknown as string })])).toBe(null);
    expect(earliestPrDate([])).toBe(null);
  });
});

describe('PR start date fallback', () => {
  it('uses earliest PR createdAt as start when issue has no startedAt', () => {
    const lanes = buildLanes({
      issues: [makeIssue({ id: '1', startedAt: null, dueDate: '2026-07-10' })],
      grouping: 'person',
      people: ROSTER,
      todayIdx: TODAY,
      prsByIssueId: new Map([['1', [makePr({ number: 501, createdAt: iso('2026-07-03') })]]]),
    });
    const scheduled = lanes.flatMap((lane) => lane.rows.flat());
    expect(scheduled.length).toBe(1);
    expect(scheduled[0].span.actualStartIdx).toBe(dayIndex(new Date(iso('2026-07-03'))));
  });
});

describe('buildLanes — state filter', () => {
  const allRows = (lanes: Lane[]) =>
    lanes.flatMap((lane) => [...lane.rows.flat(), ...lane.unscheduled]);

  it('shows every issue when no state filter is given', () => {
    const lanes = buildLanes({
      issues: [
        makeIssue({ id: '1', stateName: 'In Progress', bucket: 'active' }),
        makeIssue({ id: '2', stateName: 'Backlog', bucket: 'planned' }),
      ],
      grouping: 'person',
      people: ROSTER,
      todayIdx: TODAY,
    });
    expect(allRows(lanes).map((member) => member.issue.id).sort()).toEqual(['1', '2']);
  });

  it('hides issues whose raw state is toggled off, keeps the rest', () => {
    const lanes = buildLanes({
      issues: [
        makeIssue({ id: '1', stateName: 'In Progress', bucket: 'active' }),
        makeIssue({ id: '2', stateName: 'Backlog', bucket: 'planned' }),
      ],
      grouping: 'person',
      people: ROSTER,
      todayIdx: TODAY,
      visibleStates: { Backlog: false },
    });
    expect(allRows(lanes).map((member) => member.issue.id)).toEqual(['1']);
  });

  it('treats an unknown / true state entry as visible', () => {
    const lanes = buildLanes({
      issues: [makeIssue({ id: '1', stateName: 'Custom State', bucket: 'planned' })],
      grouping: 'person',
      people: ROSTER,
      todayIdx: TODAY,
      visibleStates: { Backlog: false },
    });
    expect(allRows(lanes).map((member) => member.issue.id)).toEqual(['1']);
  });
});

describe('buildLanes — attention-only filter', () => {
  const allRows = (lanes: Lane[]) =>
    lanes.flatMap((lane) => [...lane.rows.flat(), ...lane.unscheduled]);

  it('keeps only overdue / blocked issues when attentionOnly is set', () => {
    const lanes = buildLanes({
      issues: [
        // Overdue: due in the past, still active.
        makeIssue({ id: '1', dueDate: '2026-07-01', bucket: 'active' }),
        // Calm: due in the future.
        makeIssue({ id: '2', dueDate: '2026-07-20', bucket: 'active' }),
      ],
      grouping: 'person',
      people: ROSTER,
      todayIdx: TODAY,
      attentionOnly: true,
    });
    expect(allRows(lanes).map((member) => member.issue.id)).toEqual(['1']);
  });

  it('keeps a manually-flagged blocked issue even when it is otherwise calm', () => {
    const lanes = buildLanes({
      issues: [makeIssue({ id: '1', dueDate: '2026-07-20', bucket: 'active' })],
      grouping: 'person',
      people: ROSTER,
      todayIdx: TODAY,
      attentionOnly: true,
      blockedFlags: { '1': { blocked: true } },
    });
    expect(allRows(lanes).map((member) => member.issue.id)).toEqual(['1']);
  });
});

describe('matchesSearch', () => {
  const member = (issue: Issue, prs: PullRequest[] = []): PositionedIssue => ({
    issue,
    span: { plannedStartIdx: null, actualStartIdx: null, startIdx: null, endIdx: null, unscheduled: true },
    attention: { overdue: false, blockedDerived: false, blockedReason: null },
    prs,
  });

  const issue = makeIssue({ id: '104', assignee: priya });

  it('matches everything for an empty / whitespace query', () => {
    expect(matchesSearch(member(issue), '')).toBe(true);
    expect(matchesSearch(member(issue), '   ')).toBe(true);
  });

  it('matches the issue identifier and title, case-insensitively', () => {
    expect(matchesSearch(member(issue), 'orb-104')).toBe(true);
    expect(matchesSearch(member(issue), 'ISSUE 104')).toBe(true);
    expect(matchesSearch(member(issue), 'ORB-999')).toBe(false);
  });

  it('matches a resolved PR number, with or without a leading #', () => {
    const withPr = member(issue, [makePr({ number: 528 })]);
    expect(matchesSearch(withPr, '528')).toBe(true);
    expect(matchesSearch(withPr, '#528')).toBe(true);
    expect(matchesSearch(withPr, '#999')).toBe(false);
    expect(matchesSearch(member(issue), '528')).toBe(false);
  });
});

describe('buildLanes — search filter', () => {
  const collect = (lanes: Lane[]) => lanes.flatMap((lane) => lane.rows.flat().concat(lane.unscheduled));

  it('keeps only issues matching the query and drops the emptied lanes', () => {
    const lanes = buildLanes({
      issues: [
        makeIssue({ id: '104', assignee: priya }),
        makeIssue({ id: '205', assignee: marcus }),
      ],
      grouping: 'person',
      people: ROSTER,
      todayIdx: TODAY,
      searchQuery: 'ORB-104',
    });
    expect(lanes.map((lane) => lane.key)).toEqual([priya.id]);
    expect(collect(lanes).map((member) => member.issue.id)).toEqual(['104']);
  });

  it('finds an issue by one of its PR numbers', () => {
    const lanes = buildLanes({
      issues: [makeIssue({ id: '104', assignee: priya })],
      grouping: 'person',
      people: ROSTER,
      todayIdx: TODAY,
      prsByIssueId: new Map([['104', [makePr({ number: 528, issueKey: 'ORB-104' })]]]),
      searchQuery: '#528',
    });
    expect(collect(lanes).map((member) => member.issue.id)).toEqual(['104']);
  });

  it('surfaces a lane by an orphan PR number, keeping only the matching orphan', () => {
    const lanes = buildLanes({
      issues: [makeIssue({ id: '104', assignee: priya })],
      grouping: 'person',
      people: ROSTER,
      todayIdx: TODAY,
      orphanPrs: [
        makePr({ number: 777, author: priya, authorLogin: priya.githubLogin }),
        makePr({ number: 778, author: priya, authorLogin: priya.githubLogin }),
      ],
      searchQuery: '#777',
    });
    expect(lanes.map((lane) => lane.key)).toEqual([priya.id]);
    expect(collect(lanes)).toHaveLength(0); // no issue matched "#777"
    expect(lanes[0].orphanPrs.map((pr) => pr.number)).toEqual([777]);
  });
});
