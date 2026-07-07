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
import {
  deriveAttention,
  mergeManualBlocked,
  type DerivedAttention,
  type ManualBlockedFlag,
} from '@/lib/normalize/attention';
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
 * the unit a lane row holds. `attention` is the merged result: derived overdue/blocked
 * unioned with the app-owned manual "mark blocked" flag.
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
  /** Orphan PRs (no resolved issue) authored by this lane's person. */
  orphanPrs: readonly PullRequest[];
}

/** Inputs to {@link buildLanes}. `plannedStarts` and `blockedFlags` are app-owned. */
export interface BuildLanesInput {
  issues: readonly Issue[];
  grouping: Grouping;
  people: readonly Person[];
  todayIdx: number;
  /** App-owned planned starts by issue id ("YYYY-MM-DD"); empty when none are set. */
  plannedStarts?: Record<string, string | null>;
  /** App-owned manual "mark blocked" flags by issue id, merged into derived attention. */
  blockedFlags?: Record<string, ManualBlockedFlag>;
  /** Normalized PRs grouped by resolved issue id (drives chips + blocked derivation). */
  prsByIssueId?: ReadonlyMap<string, readonly PullRequest[]>;
  /** Wall-clock "now" for review-staleness; defaults to UTC midnight of `todayIdx`. */
  now?: Date;
  /** Count of still-pending review requests per reviewer person id (person-mode badge). */
  reviewsWaitingByPersonId?: ReadonlyMap<string, number>;
  /** Orphan PRs (no resolved issue) — shown at the bottom of the author's lane. */
  orphanPrs?: readonly PullRequest[];
  /**
   * Toolbar state filter: raw state name → visible. A state absent from the map (or `true`)
   * is shown; only an explicit `false` hides an issue. Empty map (the default) shows all.
   */
  visibleStates?: Record<string, boolean>;
  /** Attention chip: when true, keep only overdue / blocked issues (the standup focus). */
  attentionOnly?: boolean;
  /**
   * Toolbar search query: keep only issues matching it (by id/title or a resolved PR
   * number). Empty (the default) matches everything; when set, empty lanes are dropped.
   */
  searchQuery?: string;
}

/**
 * Whether an issue (or one of its resolved PRs) matches the toolbar search query. Matches
 * the issue identifier or title (case-insensitive substring), or a resolved PR number
 * (with or without a leading `#`). An empty/whitespace query matches everything.
 */
export function matchesSearch(member: PositionedIssue, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;

  const { issue, prs } = member;
  if (issue.identifier.toLowerCase().includes(trimmed)) return true;
  if (issue.title.toLowerCase().includes(trimmed)) return true;

  const numberQuery = trimmed.replace(/^#/, '');
  if (numberQuery && /^\d+$/.test(numberQuery)) {
    return prs.some((pr) => String(pr.number).includes(numberQuery));
  }
  return false;
}

/**
 * The toolbar filters applied before grouping: hide issues whose raw state is toggled off,
 * and (when the attention chip is active) keep only overdue / blocked issues. Attention is
 * read off the already-merged {@link PositionedIssue}, so a manually-flagged blocked issue
 * survives the chip filter just like a derived-blocked one.
 */
function passesFilters(
  member: PositionedIssue,
  visibleStates: Record<string, boolean>,
  attentionOnly: boolean,
  searchQuery: string,
): boolean {
  if (visibleStates[member.issue.stateName] === false) return false;
  if (attentionOnly && !member.attention.overdue && !member.attention.blockedDerived) return false;
  if (!matchesSearch(member, searchQuery)) return false;
  return true;
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

/** Pair an issue with its span, attention (derived ∪ manual blocked), and resolved PRs. */
function positionIssue(
  issue: Issue,
  todayIdx: number,
  plannedStarts: Record<string, string | null>,
  blockedFlags: Record<string, ManualBlockedFlag>,
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
  const attention = mergeManualBlocked(deriveAttention(issue, prs, now), blockedFlags[issue.id]);
  return { issue, span, attention, prs };
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
  orphanPrs: readonly PullRequest[] = [],
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
    orphanPrs,
  };
}

/**
 * Group issues into swimlanes, sort each lane attention-first then by status bucket, and
 * pack it into non-overlapping rows. Issues are first put through the toolbar filters
 * ({@link BuildLanesInput.visibleStates} and {@link BuildLanesInput.attentionOnly}) so the
 * lane summaries and packed rows reflect exactly what the board is showing.
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
  blockedFlags = {},
  prsByIssueId = new Map(),
  now = dateFromDayIndex(todayIdx),
  reviewsWaitingByPersonId = new Map(),
  orphanPrs = [],
  visibleStates = {},
  attentionOnly = false,
  searchQuery = '',
}: BuildLanesInput): Lane[] {
  const searchActive = searchQuery.trim().length > 0;
  const positioned = issues
    .map((issue) =>
      positionIssue(issue, todayIdx, plannedStarts, blockedFlags, prsByIssueId, now),
    )
    .filter((member) => passesFilters(member, visibleStates, attentionOnly, searchQuery));

  const identityByKey = new Map<string, LaneIdentity>();
  const membersByKey = new Map<string, PositionedIssue[]>();
  for (const member of positioned) {
    const identity = laneIdentity(member.issue, grouping);
    if (!identityByKey.has(identity.key)) identityByKey.set(identity.key, identity);
    const list = membersByKey.get(identity.key) ?? [];
    list.push(member);
    membersByKey.set(identity.key, list);
  }

  const orphansByPersonId = new Map<string, PullRequest[]>();
  if (grouping === 'person') {
    for (const pr of orphanPrs) {
      const personId = pr.author?.id ?? UNASSIGNED_KEY;
      const list = orphansByPersonId.get(personId) ?? [];
      list.push(pr);
      orphansByPersonId.set(personId, list);
    }
  }

  const orderedKeys =
    grouping === 'person'
      ? personLaneOrder(people, membersByKey, orphansByPersonId)
      : projectLaneOrder(identityByKey);

  // While searching, the "always show every roster lane" rule would leave a wall of empty
  // lanes around the few matches, so drop lanes the query left empty.
  const visibleKeys = searchActive
    ? orderedKeys.filter((key) => (membersByKey.get(key)?.length ?? 0) > 0)
    : orderedKeys;

  return visibleKeys.map((key) => {
    const identity = identityByKey.get(key) ?? syntheticIdentity(key, people);
    const reviewsWaiting =
      grouping === 'person' ? (reviewsWaitingByPersonId.get(key) ?? 0) : 0;
    const laneOrphans = orphansByPersonId.get(key) ?? [];
    return assembleLane(identity, membersByKey.get(key) ?? [], reviewsWaiting, laneOrphans);
  });
}

/** Person-mode lane order: every roster person, then off-roster assignees, then Unassigned. */
function personLaneOrder(
  people: readonly Person[],
  membersByKey: ReadonlyMap<string, PositionedIssue[]>,
  orphansByKey: ReadonlyMap<string, PullRequest[]> = new Map(),
): string[] {
  const rosterKeys = people.map((person) => person.id);
  const rosterSet = new Set(rosterKeys);
  const allKeys = new Set([...membersByKey.keys(), ...orphansByKey.keys()]);
  const offRoster = [...allKeys]
    .filter((key) => key !== UNASSIGNED_KEY && !rosterSet.has(key))
    .sort();
  const needsUnassigned = membersByKey.has(UNASSIGNED_KEY) || orphansByKey.has(UNASSIGNED_KEY);
  const unassigned = needsUnassigned ? [UNASSIGNED_KEY] : [];
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
