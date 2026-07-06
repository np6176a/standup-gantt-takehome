import {
  computeSpan,
  knownIdentifiers,
  normalizeIssue,
  normalizeIssues,
  spanInterval,
} from '@/lib/normalize/issues';
import { dayIndexFromDateString } from '@/lib/gantt/scale';
import { seedLinearIssueNodes, type RawLinearIssueNode } from '@/lib/fake-source/seed';

const NOW = new Date('2026-07-06T12:00:00.000Z');
const TODAY_IDX = dayIndexFromDateString('2026-07-06');
const nodes = seedLinearIssueNodes(NOW);
const byId = (id: string): RawLinearIssueNode =>
  nodes.find((node) => node.identifier === id)!;

describe('normalizeIssue', () => {
  it('keeps the raw state, adds bucket + automation flag', () => {
    const active = normalizeIssue(byId('ORB-101')); // In Progress
    expect(active.stateName).toBe('In Progress');
    expect(active.bucket).toBe('active');
    expect(active.automationOwned).toBe(true);

    const design = normalizeIssue(byId('ORB-111')); // Design Exploration
    expect(design.bucket).toBe('active');
    expect(design.automationOwned).toBe(false);

    const canceled = normalizeIssue(byId('ORB-108')); // Canceled
    expect(canceled.bucket).toBe('dropped');
  });

  it('resolves the assignee to a roster person (email → githubLogin)', () => {
    expect(normalizeIssue(byId('ORB-101')).assignee?.githubLogin).toBe('pnadkarni');
  });

  it('keeps a null assignee null', () => {
    expect(normalizeIssue(byId('ORB-125')).assignee).toBeNull();
  });

  it('normalizes the whole seed set and exposes its identifiers', () => {
    const issues = normalizeIssues(nodes);
    expect(issues).toHaveLength(32);
    const known = knownIdentifiers(issues);
    expect(known.size).toBe(32);
    expect(known.has('ORB-101')).toBe(true);
  });
});

describe('computeSpan', () => {
  const spanFor = (id: string) => {
    const node = byId(id);
    return computeSpan({
      plannedStart: null,
      startedAt: node.startedAt,
      dueDate: node.dueDate,
      todayIdx: TODAY_IDX,
    });
  };

  it('ORB-101: started with a due date → start at actual, end at due', () => {
    const span = spanFor('ORB-101');
    expect(span.startIdx).toBe(span.actualStartIdx);
    expect(span.actualStartIdx).not.toBeNull();
    expect(span.endIdx).toBe(dayIndexFromDateString(byId('ORB-101').dueDate!));
    expect(span.unscheduled).toBe(false);
  });

  it('ORB-103: open-ended (started, no due) → runs to today', () => {
    const span = spanFor('ORB-103');
    expect(span.startIdx).not.toBeNull();
    expect(span.endIdx).toBe(TODAY_IDX);
  });

  it('ORB-102: planned-not-started (no start, future due) → start null, end at due, still scheduled', () => {
    const span = spanFor('ORB-102');
    expect(span.startIdx).toBeNull();
    expect(span.endIdx).toBe(dayIndexFromDateString(byId('ORB-102').dueDate!));
    expect(span.unscheduled).toBe(false);
    // spanInterval collapses a due-only span to a marker at the due date.
    expect(spanInterval(span)).toEqual({ start: span.endIdx, end: span.endIdx });
  });

  it('ORB-107: no start and no due → unscheduled, no packing interval', () => {
    const span = spanFor('ORB-107');
    expect(span.unscheduled).toBe(true);
    expect(spanInterval(span)).toBeNull();
  });

  it('never produces a reversed span for a future planned start with no due date', () => {
    const future = dayIndexFromDateString('2026-07-06') + 5;
    const span = computeSpan({
      plannedStart: '2026-07-11', // 5 days after today, no actual start, no due date
      startedAt: null,
      dueDate: null,
      todayIdx: TODAY_IDX,
    });
    expect(span.startIdx).toBe(future);
    expect(span.endIdx).toBe(future); // clamped to start, not pulled back to today
    expect(span.endIdx!).toBeGreaterThanOrEqual(span.startIdx!);
    expect(spanInterval(span)).toEqual({ start: future, end: future });
  });

  it('never produces a reversed span when the due date precedes the start (started late)', () => {
    // Issue started after it was already overdue: startedAt is AFTER dueDate.
    const span = computeSpan({
      plannedStart: null,
      startedAt: '2026-07-06T09:00:00.000Z', // started today
      dueDate: '2026-07-01', // was due five days ago
      todayIdx: TODAY_IDX,
    });
    expect(span.startIdx).toBe(dayIndexFromDateString('2026-07-06'));
    expect(span.endIdx!).toBeGreaterThanOrEqual(span.startIdx!); // clamped, not reversed
    const packed = spanInterval(span)!;
    expect(packed.end).toBeGreaterThanOrEqual(packed.start);
  });

  it('planned start takes precedence over the actual start as the visual left edge', () => {
    const span = computeSpan({
      plannedStart: '2026-07-01',
      startedAt: '2026-07-03T09:00:00.000Z',
      dueDate: '2026-07-10',
      todayIdx: TODAY_IDX,
    });
    expect(span.plannedStartIdx).toBe(dayIndexFromDateString('2026-07-01'));
    expect(span.actualStartIdx).toBe(dayIndexFromDateString('2026-07-03'));
    expect(span.startIdx).toBe(span.plannedStartIdx);
    // The gap between planned and actual is the plan-vs-reality drift.
    expect(span.actualStartIdx).toBeGreaterThan(span.startIdx!);
  });
});
