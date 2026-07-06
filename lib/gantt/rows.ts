// Board rows: turn normalized issues into grouped, sorted, non-overlapping swimlanes.
//
// This is the pure core behind the store's `ganttRows` computed. Grouping is just a
// re-keying of the same issues (by assignee, or by project), so the toggle is a cheap
// re-run. Within a lane, issues sort by status bucket (attention-first ordering arrives
// in a later milestone) and then pack into as few rows as possible via `packLanes`.
// No-date issues carry no span and are set aside for the per-lane "unscheduled" shelf.

import type { Issue, Person } from '@/lib/domain/types';
import { bucketRank } from '@/lib/domain/states';
import { computeSpan, spanInterval, type IssueSpan } from '@/lib/normalize/issues';
import { packLanes } from '@/lib/gantt/layout';

/** Swimlane grouping: per-person (standup) vs per-project (Linear-screenshot). */
export type Grouping = 'person' | 'project';

/** Lane key + title for the synthetic "no assignee" person lane. */
export const UNASSIGNED_KEY = '__unassigned__';
/** Lane key + title for the synthetic "no project" lane. */
export const NO_PROJECT_KEY = '__no_project__';

/** An issue paired with its derived timeline span — the unit a lane row holds. */
export interface PositionedIssue {
  issue: Issue;
  span: IssueSpan;
}

/** One swimlane: a header identity plus its packed rows and unscheduled shelf. */
export interface Lane {
  /** Stable grouping key (person id, project id, or a synthetic sentinel). */
  key: string;
  /** Display title (person displayName / project name / "Unassigned" / "No project"). */
  title: string;
  /** The lane's person in person-grouping (drives the avatar); null otherwise. */
  person: Person | null;
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

/** Pair an issue with its span for the given planned starts + today. */
function positionIssue(
  issue: Issue,
  todayIdx: number,
  plannedStarts: Record<string, string | null>,
): PositionedIssue {
  const span = computeSpan({
    plannedStart: plannedStarts[issue.id] ?? null,
    startedAt: issue.startedAt,
    dueDate: issue.dueDate,
    todayIdx,
  });
  return { issue, span };
}

/** Assemble a lane from its identity and members: bucket-sort, then pack the scheduled ones. */
function assembleLane(identity: LaneIdentity, members: readonly PositionedIssue[]): Lane {
  const scheduled = members.filter((member) => !member.span.unscheduled);
  const unscheduled = members.filter((member) => member.span.unscheduled);
  const byBucket = [...scheduled].sort(
    (a, b) => bucketRank(a.issue.bucket) - bucketRank(b.issue.bucket),
  );
  const rows = packLanes(byBucket, (member) => spanInterval(member.span)!);
  return {
    key: identity.key,
    title: identity.title,
    person: identity.person,
    rows,
    unscheduled: [...unscheduled].sort(
      (a, b) => bucketRank(a.issue.bucket) - bucketRank(b.issue.bucket),
    ),
  };
}

/**
 * Group issues into swimlanes, sort each lane by status bucket, and pack it into
 * non-overlapping rows.
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
}: BuildLanesInput): Lane[] {
  const positioned = issues.map((issue) => positionIssue(issue, todayIdx, plannedStarts));

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

  return orderedKeys.map((key) =>
    assembleLane(
      identityByKey.get(key) ?? syntheticIdentity(key, people),
      membersByKey.get(key) ?? [],
    ),
  );
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
