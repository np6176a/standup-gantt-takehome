// Issue normalization + timeline-span derivation.
//
// Normalization keeps the raw state name and adds its bucket + automation-owned flag
// and the canonical assignee (resolved through the app roster by email). Span
// derivation resolves a single start from one source-of-truth chain: Linear's
// automation-stamped start if present, else the earliest linked PR's start, else the
// app-owned manual (temporary) start the user set. Linear/PR always win — the manual
// start is a placeholder that Linear overwrites the moment it stamps a real one. An
// issue with neither a start nor a due date has no span and belongs on the unscheduled shelf.

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

// Per-node memoization of issue normalization. Raw nodes are immutable once fetched — a
// mutation REPLACES the node object rather than editing it in place (see
// dataStore.applyIssueNode's `.map`), so a node's identity is a sound cache key: the same
// object always normalizes to the same Issue. This buys two things when one issue changes:
// only the single new node re-normalizes (the other N-1 keep their identity and hit the
// cache), and unchanged rows keep a STABLE Issue reference, so downstream memoized
// computeds and `observer` components can bail out instead of re-rendering.
//
// NOTE (perf — revisit at scale, see NOTES.md): this memoizes the normalize STEP only.
// The rest of the pipeline (PR normalization, bucket sort, packLanes, grouping) still
// rebuilds wholesale on any change. At the seed's ~32 issues / 40 PRs that is
// imperceptible; the proper long-term fix is to make the store hold an observable per-id
// Issue map so a single mutation flows through the WHOLE pipeline touching one entry, and
// to memoize PR normalization keyed on (batch identity, known-identifier set) — PRs can't
// use this simple per-node cache because their resolution is batch-level (stack
// inheritance + validation against the live identifier set), not a pure function of one node.
const normalizedIssueCache = new WeakMap<WireIssueNode, Issue>();

/**
 * Like {@link normalizeIssues} but memoized per raw node, so unchanged nodes are not
 * re-normalized across calls and keep a stable {@link Issue} reference. Use this at the
 * store boundary; {@link normalizeIssue}/{@link normalizeIssues} stay stateless for tests.
 */
export function normalizeIssuesMemoized(nodes: readonly WireIssueNode[]): Issue[] {
  return nodes.map((node) => {
    const cached = normalizedIssueCache.get(node);
    if (cached) return cached;
    const normalized = normalizeIssue(node);
    normalizedIssueCache.set(node, normalized);
    return normalized;
  });
}

/** The set of live issue identifiers, for validating PR→issue resolution. */
export function knownIdentifiers(issues: readonly Issue[]): Set<string> {
  return new Set(issues.map((issue) => issue.identifier));
}

/** A resolved timeline span, in day indices, plus the actual-vs-manual start provenance. */
export interface IssueSpan {
  /** Actual start day index — Linear's stamp, else the earliest linked PR. The source of
   *  truth; null when neither exists (only a manual start, or nothing). */
  actualStartIdx: number | null;
  /** True when {@link startIdx} came from the manual (temporary) start because no actual
   *  start exists yet — the placeholder Linear will overwrite once it stamps a real one. */
  isManualStart: boolean;
  /** Visual left edge: the actual start if known, else the manual start. Null when neither exists. */
  startIdx: number | null;
  /**
   * Inclusive last day the item covers: due date if set, else today when the bar has
   * started, else null. This is a semantic anchor (for date labels); the half-open
   * packing/geometry interval is produced by {@link spanInterval}, which turns it into
   * an exclusive edge.
   */
  endIdx: number | null;
  /** True when the issue has no start and no due date (belongs on the unscheduled shelf). */
  unscheduled: boolean;
}

/** Inputs to {@link computeSpan}: the issue's dates plus the app-owned manual start and today. */
export interface SpanInput {
  /** App-owned manual (temporary) start ("YYYY-MM-DD"), used only until an actual start exists. */
  manualStart: string | null;
  /** Actual start: Linear's stamped start, else the earliest linked PR. The source of truth. */
  startedAt: string | null;
  dueDate: string | null;
  todayIdx: number;
}

/**
 * Derive an issue's timeline span in day indices. `start = startedAt ?? manualStart` —
 * the actual (Linear/PR) start is the source of truth and always wins; the manual start
 * is only a placeholder used while no actual start exists yet. `end = dueDate ?? (start ?
 * today : null)`. Both edges null → unscheduled.
 */
export function computeSpan({ manualStart, startedAt, dueDate, todayIdx }: SpanInput): IssueSpan {
  const actualStartIdx = startedAt ? dayIndexFromDateString(startedAt) : null;
  const manualStartIdx = manualStart ? dayIndexFromDateString(manualStart) : null;
  const startIdx = actualStartIdx ?? manualStartIdx;
  const dueIdx = dueDate ? dayIndexFromDateString(dueDate) : null;
  const rawEndIdx = dueIdx ?? (startIdx !== null ? todayIdx : null);
  // Guarantee end >= start so the span is always a valid [start, end). A due date
  // earlier than the start — an issue started after it was already due (started late),
  // or a manual start set past the due date — would otherwise reverse the interval
  // and corrupt packing and bar geometry. Overdue is driven by dueDate separately, so
  // clamping the geometry here never hides the red treatment. Also covers the future
  // manual-start-with-no-due case (rawEndIdx = today, clamped up to the start).
  const endIdx =
    rawEndIdx !== null && startIdx !== null ? Math.max(rawEndIdx, startIdx) : rawEndIdx;

  return {
    actualStartIdx,
    isManualStart: startIdx !== null && actualStartIdx === null,
    startIdx,
    endIdx,
    unscheduled: startIdx === null && endIdx === null,
  };
}

/**
 * True for a due-only span: no start, just a due date. It renders as a point (a marker)
 * at the due day rather than as a bar, but still occupies its day for packing so two
 * markers on the same day don't stack on top of each other.
 */
export function isDueOnlyMarker(span: IssueSpan): boolean {
  return span.startIdx === null && span.endIdx !== null;
}

/** Real-bar half-open interval: inclusive `endIdx` made exclusive so whole days are
 *  covered. `lastDay` is `endIdx` (always ≥ start for a real bar); `?? startIdx` is
 *  only a guard. Not exported — callers use {@link spanInterval} / {@link renderInterval}. */
function realBarInterval(span: IssueSpan): Interval {
  const lastDay = span.endIdx ?? span.startIdx!;
  return { start: span.startIdx!, end: lastDay + 1 };
}

/**
 * The **packing** interval (for `packLanes`) — every scheduled item claims at least one
 * whole day. A real bar is `[startIdx, endIdx + 1)` (same-day task = one day wide,
 * open-ended work covers today). A due-only marker occupies its due day
 * `[endIdx, endIdx + 1)` so two same-day markers pack into separate rows rather than
 * drawing on top of each other. Null only when the span is unscheduled.
 *
 * NOTE: this is NOT the render geometry for a marker — a marker renders as a point, so
 * bar placement uses {@link renderInterval}, which keeps a marker zero-length.
 */
export function spanInterval(span: IssueSpan): Interval | null {
  if (span.unscheduled) return null;
  if (isDueOnlyMarker(span)) return { start: span.endIdx!, end: span.endIdx! + 1 };
  return realBarInterval(span);
}

/**
 * The **render** interval that `barMetrics` consumes. Identical to {@link spanInterval}
 * for a real bar, but a due-only marker is zero-length `[endIdx, endIdx)` so `barMetrics`
 * draws it as a point (its `startIdx === endIdx` marker path) rather than a one-day bar.
 * Null only when the span is unscheduled.
 */
export function renderInterval(span: IssueSpan): Interval | null {
  if (span.unscheduled) return null;
  if (isDueOnlyMarker(span)) return { start: span.endIdx!, end: span.endIdx! };
  return realBarInterval(span);
}
