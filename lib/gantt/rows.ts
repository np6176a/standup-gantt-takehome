// Board rows: turn normalized issues into grouped, sorted, non-overlapping swimlanes.
//
// This is the pure core behind the store's `ganttRows` computed. Grouping is just a
// re-keying of the same issues (by assignee, or by project), so the toggle is a cheap
// re-run. Each issue is enriched with its derived attention (overdue / blocked) and its
// resolved PRs, then within a lane issues sort attention-first (blocked → overdue) and
// then by status bucket, and pack into as few rows as possible via `packLanes`. Every
// lane also carries a badge summary (the counts the LaneHeader cluster renders).
// No-date issues carry no span and are set aside for the per-lane "unscheduled" shelf.

import type { Issue, Person } from '@/lib/domain/types';
import { bucketRank } from '@/lib/domain/states';
import { computeSpan, spanInterval, type IssueSpan } from '@/lib/normalize/issues';
import { deriveAttention, type DerivedAttention } from '@/lib/normalize/attention';
import type { PullRequest } from '@/lib/normalize/pullRequests';
import { dateFromDayIndex } from '@/lib/gantt/scale';
import { packLanes } from '@/lib/gantt/layout';

/** Swimlane grouping: per-person (standup) vs per-project (Linear-screenshot). */
export type Grouping = 'person' | 'project';

/** Lane key + title for the synthetic "no assignee" person lane. */
export const UNASSIGNED_KEY = '__unassigned__';
/** Lane key + title for the synthetic "no project" lane. */
export const NO_PROJECT_KEY = '__no_project__';

/**
 * An issue paired with its derived timeline span, attention signals, and resolved PRs —
 * the unit a lane row holds. `attention` here is the DERIVED result only; the manual
 * "mark blocked" flag is merged in at the store level in a later milestone.
 */
export interface PositionedIssue {
  issue: Issue;
  span: IssueSpan;
  attention: DerivedAttention;
  prs: readonly PullRequest[];
}

/** The badge-cluster counts for a lane header (the standup-at-a-glance summary). */
export interface LaneSummary {
  /** Issues flagged blocked (derived, ⛔). */
  blocked: number;
  /** Issues past their due date and not done/canceled (⚠). */
  overdue: number;
  /** Issues in the Active bucket (●). */
  active: number;
  /** Issues in the In Review bucket (◐). */
  inReview: number;
  /** Review requests still waiting on this lane's person (👁, person mode only). */
  reviewsWaiting: number;
}

/** One swimlane: a header identity + badge summary plus its packed rows and shelf. */
export interface Lane {
  /** Stable grouping key (person id, project id, or a synthetic sentinel). */
  key: string;
  /** Display title (person displayName / project name / "Unassigned" / "No project"). */
  title: string;
  /** The lane's person in person-grouping (drives the avatar); null otherwise. */
  person: Person | null;
  /** Badge-cluster counts for the lane header. */
  summary: LaneSummary;
  /** Scheduled issues packed into non-overlapping rows, top row first. */
  rows: PositionedIssue[][];
  /** No-date issues for this lane's unscheduled shelf. */
  unscheduled: PositionedIssue[];
}

/** Inputs to {@link buildLanes}. `plannedStarts` (app-owned) arrives in a later milestone. */
export interface BuildLanesInput {
  issues: readonly Issue[];
  grouping: Grouping;
  people: readonly Person[];
  todayIdx: number;
  /** App-owned planned starts by issue id ("YYYY-MM-DD"); empty until planningStore exists. */
  plannedStarts?: Record<string, string | null>;
  /** Normalized PRs grouped by resolved issue id (drives chips + blocked derivation). */
  prsByIssueId?: ReadonlyMap<string, readonly PullRequest[]>;
  /** Wall-clock "now" for review-staleness; defaults to UTC midnight of `todayIdx`. */
  now?: Date;
  /** Count of still-pending review requests per reviewer person id (person-mode badge). */
  reviewsWaitingByPersonId?: ReadonlyMap<string, number>;
}

/** The grouping identity of an issue: which lane it belongs to and how that lane reads. */
interface LaneIdentity {
  key: string;
  title: string;
  person: Person | null;
}

/** Resolve an issue's lane identity for the active grouping. */
function laneIdentity(issue: Issue, grouping: Grouping): LaneIdentity {
  if (grouping === 'project') {
    return issue.project
      ? { key: issue.project.id, title: issue.project.name, person: null }
      : { key: NO_PROJECT_KEY, title: 'No project', person: null };
  }
  return issue.assignee
    ? { key: issue.assignee.id, title: issue.assignee.displayName, person: issue.assignee }
    : { key: UNASSIGNED_KEY, title: 'Unassigned', person: null };
}

/** The earliest PR createdAt across a set of PRs, or null if none have one. */
export function earliestPrDate(prs: readonly PullRequest[]): string | null {
  const dates = prs.map((pr) => pr.createdAt).filter(Boolean) as string[];
  return dates.length > 0 ? dates.reduce((a, b) => (a < b ? a : b)) : null;
}

/** Pair an issue with its span, derived attention, and resolved PRs. */
function positionIssue(
  issue: Issue,
  todayIdx: number,
  plannedStarts: Record<string, string | null>,
  prsByIssueId: ReadonlyMap<string, readonly PullRequest[]>,
  now: Date,
): PositionedIssue {
  const prs = prsByIssueId.get(issue.id) ?? [];
  const startedAt = issue.startedAt ?? earliestPrDate(prs);
  const span = computeSpan({
    plannedStart: plannedStarts[issue.id] ?? null,
    startedAt,
    dueDate: issue.dueDate,
    todayIdx,
  });
  return { issue, span, attention: deriveAttention(issue, prs, now), prs };
}

/**
 * Sort rank within a lane: blocked and overdue float above every bucket (they are the
 * standup signal), blocked above overdue, then Active → In Review → Shipping → Planned →
 * Done → Dropped. `Array.sort` is stable, so ties keep input order.
 */
function memberRank(member: PositionedIssue): number {
  if (member.attention.blockedDerived) return -2;
  if (member.attention.overdue) return -1;
  return bucketRank(member.issue.bucket);
}

const byRank = (a: PositionedIssue, b: PositionedIssue): number =>
  memberRank(a) - memberRank(b);

/** Tally the badge-cluster counts across a lane's members. */
function summarize(members: readonly PositionedIssue[], reviewsWaiting: number): LaneSummary {
  return members.reduce<LaneSummary>(
    (summary, member) => ({
      blocked: summary.blocked + (member.attention.blockedDerived ? 1 : 0),
      overdue: summary.overdue + (member.attention.overdue ? 1 : 0),
      active: summary.active + (member.issue.bucket === 'active' ? 1 : 0),
      inReview: summary.inReview + (member.issue.bucket === 'review' ? 1 : 0),
      reviewsWaiting: summary.reviewsWaiting,
    }),
    { blocked: 0, overdue: 0, active: 0, inReview: 0, reviewsWaiting },
  );
}

/** Assemble a lane from its identity and members: attention-sort, pack, and summarize. */
function assembleLane(
  identity: LaneIdentity,
  members: readonly PositionedIssue[],
  reviewsWaiting: number,
): Lane {
  const scheduled = members.filter((member) => !member.span.unscheduled);
  const unscheduled = members.filter((member) => member.span.unscheduled);
  const rows = packLanes([...scheduled].sort(byRank), (member) => spanInterval(member.span)!);
  return {
    key: identity.key,
    title: identity.title,
    person: identity.person,
    summary: summarize(members, reviewsWaiting),
    rows,
    unscheduled: [...unscheduled].sort(byRank),
  };
}

/**
 * Group issues into swimlanes, sort each lane attention-first then by status bucket, and
 * pack it into non-overlapping rows.
 *
 * Lane order is deliberate: in person mode every roster teammate gets a lane (in roster
 * order) so the whole team is always visible for standup — even someone with no issues —
 * with any off-roster assignee lanes and the "Unassigned" lane appended last. In project
 * mode only projects that actually carry issues appear (alphabetical), with "No project"
 * last.
 */
export function buildLanes({
  issues,
  grouping,
  people,
  todayIdx,
  plannedStarts = {},
  prsByIssueId = new Map(),
  now = dateFromDayIndex(todayIdx),
  reviewsWaitingByPersonId = new Map(),
}: BuildLanesInput): Lane[] {
  const positioned = issues.map((issue) =>
    positionIssue(issue, todayIdx, plannedStarts, prsByIssueId, now),
  );

  const identityByKey = new Map<string, LaneIdentity>();
  const membersByKey = new Map<string, PositionedIssue[]>();
  for (const member of positioned) {
    const identity = laneIdentity(member.issue, grouping);
    if (!identityByKey.has(identity.key)) identityByKey.set(identity.key, identity);
    const list = membersByKey.get(identity.key) ?? [];
    list.push(member);
    membersByKey.set(identity.key, list);
  }

  const orderedKeys =
    grouping === 'person'
      ? personLaneOrder(people, membersByKey)
      : projectLaneOrder(identityByKey);

  return orderedKeys.map((key) => {
    const identity = identityByKey.get(key) ?? syntheticIdentity(key, people);
    // Reviews-waiting is a per-PERSON signal, so it only applies when the lane key IS a
    // person id (person mode). In project mode the lane isn't a person → no review badge.
    const reviewsWaiting =
      grouping === 'person' ? (reviewsWaitingByPersonId.get(key) ?? 0) : 0;
    return assembleLane(identity, membersByKey.get(key) ?? [], reviewsWaiting);
  });
}

/** Person-mode lane order: every roster person, then off-roster assignees, then Unassigned. */
function personLaneOrder(
  people: readonly Person[],
  membersByKey: ReadonlyMap<string, PositionedIssue[]>,
): string[] {
  const rosterKeys = people.map((person) => person.id);
  const rosterSet = new Set(rosterKeys);
  const offRoster = [...membersByKey.keys()]
    .filter((key) => key !== UNASSIGNED_KEY && !rosterSet.has(key))
    .sort();
  const unassigned = membersByKey.has(UNASSIGNED_KEY) ? [UNASSIGNED_KEY] : [];
  return [...rosterKeys, ...offRoster, ...unassigned];
}

/** Project-mode lane order: real projects alphabetically, then "No project" last. */
function projectLaneOrder(identityByKey: ReadonlyMap<string, LaneIdentity>): string[] {
  const keys = [...identityByKey.keys()];
  const real = keys
    .filter((key) => key !== NO_PROJECT_KEY)
    .sort((a, b) => identityByKey.get(a)!.title.localeCompare(identityByKey.get(b)!.title));
  const noProject = identityByKey.has(NO_PROJECT_KEY) ? [NO_PROJECT_KEY] : [];
  return [...real, ...noProject];
}

/** Identity for a roster person's lane that happens to hold no issues (person mode only). */
function syntheticIdentity(key: string, people: readonly Person[]): LaneIdentity {
  const person = people.find((candidate) => candidate.id === key) ?? null;
  return { key, title: person?.displayName ?? key, person };
}
