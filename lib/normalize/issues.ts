// Issue normalization + timeline-span derivation.
//
// Normalization keeps the raw state name and adds its bucket + automation-owned flag
// and the canonical assignee (resolved through the app roster by email). Span
// derivation answers the plan-vs-reality question: the visual start is the planned
// start (app-owned) if set, else the automation-stamped actual start; the solid fill
// begins at the actual start, so the gap between them IS the drift. An issue with
// neither a start nor a due date has no span and belongs on the unscheduled shelf.

import type { Issue, Person } from '@/lib/domain/types';
import type { WireIssueNode, WireUser } from '@/lib/domain/wire';
import { bucketForState, isAutomationOwned } from '@/lib/domain/states';
import { personByEmail } from '@/lib/domain/roster';
import { dayIndexFromDateString } from '@/lib/gantt/scale';
import type { Interval } from '@/lib/gantt/layout';

/** Resolve an issue's assignee to a canonical roster Person, else adapt the raw user. */
function resolveAssignee(raw: WireUser | null): Person | null {
  if (!raw) return null;
  const known = personByEmail(raw.email);
  if (known) return known;
  // Off-roster assignee (shouldn't happen with the seed): keep their Linear identity,
  // with no GitHub login to join on.
  return {
    id: raw.id,
    name: raw.name,
    displayName: raw.displayName,
    email: raw.email,
    githubLogin: '',
  };
}

/** Normalize one raw Linear issue node into the app's Issue record. */
export function normalizeIssue(node: WireIssueNode): Issue {
  // A null state is treated as Triage (the neutral intake state) rather than dropped.
  const stateName = node.state?.name ?? 'Triage';
  return {
    id: node.id,
    identifier: node.identifier,
    title: node.title,
    url: node.url,
    stateName,
    bucket: bucketForState(stateName),
    automationOwned: isAutomationOwned(stateName),
    startedAt: node.startedAt,
    dueDate: node.dueDate,
    assignee: resolveAssignee(node.assignee),
    project: node.project,
    projectMilestone: node.projectMilestone,
  };
}

/** Normalize a batch of raw issue nodes. */
export function normalizeIssues(nodes: readonly WireIssueNode[]): Issue[] {
  return nodes.map(normalizeIssue);
}

/** The set of live issue identifiers, for validating PR→issue resolution. */
export function knownIdentifiers(issues: readonly Issue[]): Set<string> {
  return new Set(issues.map((issue) => issue.identifier));
}

/** A resolved timeline span, in day indices, plus the plan-vs-actual start edges. */
export interface IssueSpan {
  /** Planned-start day index (app-owned), or null. */
  plannedStartIdx: number | null;
  /** Actual (automation-stamped) start day index, or null. */
  actualStartIdx: number | null;
  /** Visual left edge: planned start if set, else actual start. Null when neither exists. */
  startIdx: number | null;
  /** Right edge: due date if set, else today when the bar has started, else null. */
  endIdx: number | null;
  /** True when the issue has no start and no due date (belongs on the unscheduled shelf). */
  unscheduled: boolean;
}

/** Inputs to {@link computeSpan}: the issue's dates plus app-owned planned start and today. */
export interface SpanInput {
  plannedStart: string | null;
  startedAt: string | null;
  dueDate: string | null;
  todayIdx: number;
}

/**
 * Derive an issue's timeline span in day indices. `start = plannedStart ?? startedAt`;
 * `end = dueDate ?? (start ? today : null)`. Both edges null → unscheduled.
 */
export function computeSpan({ plannedStart, startedAt, dueDate, todayIdx }: SpanInput): IssueSpan {
  const plannedStartIdx = plannedStart ? dayIndexFromDateString(plannedStart) : null;
  const actualStartIdx = startedAt ? dayIndexFromDateString(startedAt) : null;
  const startIdx = plannedStartIdx ?? actualStartIdx;
  const dueIdx = dueDate ? dayIndexFromDateString(dueDate) : null;
  // With no due date, a started bar runs to today — but a *future* planned start has
  // no elapsed span, so clamp the end to at least the start to avoid a reversed
  // [start, end) interval (which would break packing and bar geometry).
  const endIdx = dueIdx ?? (startIdx !== null ? Math.max(startIdx, todayIdx) : null);

  return {
    plannedStartIdx,
    actualStartIdx,
    startIdx,
    endIdx,
    unscheduled: startIdx === null && endIdx === null,
  };
}

/**
 * The packing interval for a span, or null when unscheduled. A due-only span (start
 * null, end set) collapses to a zero-length marker at the due date, and vice versa,
 * so packing always has a concrete `[start, end)`.
 */
export function spanInterval(span: IssueSpan): Interval | null {
  if (span.unscheduled) return null;
  const start = span.startIdx ?? span.endIdx!;
  const end = span.endIdx ?? span.startIdx!;
  return { start, end };
}
