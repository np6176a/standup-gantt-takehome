// The external GraphQL wire contract the app normalizes FROM.
//
// These types describe exactly the fields our normalization reads off the
// Linear / GitHub GraphQL responses. They are declared here — app-owned — rather
// than imported from `lib/fake-source/*`, because the Fake source impersonates an
// external system: app code must not depend on the impersonator (the same reason
// the roster is transcribed in roster.ts, not imported from seed's TEAM). The
// shapes are a structural subset of what the Fake source returns, so its payloads
// (and, in tests, its seed fixtures) are assignable to these interfaces.

/** GitHub review submission states, as the `reviews.nodes[].state` wire enum. */
export type GithubReviewState =
  | 'APPROVED'
  | 'CHANGES_REQUESTED'
  | 'COMMENTED'
  | 'DISMISSED'
  | 'PENDING';

/** Pull-request lifecycle state, as the `pullRequest.state` wire enum. */
export type PullRequestState = 'OPEN' | 'MERGED' | 'CLOSED';

/** A Linear user nested on an issue node (`email` is the cross-tool join key). */
export interface WireUser {
  id: string;
  name: string;
  displayName: string;
  email: string;
}

/** A named node (project / milestone) as Linear nests it on an issue. */
export interface WireNamedNode {
  id: string;
  name: string;
}

/** A Linear issue node in the shape `issues.nodes[]` returns. */
export interface WireIssueNode {
  id: string;
  identifier: string;
  title: string;
  url: string;
  /** ISO timestamp auto-stamped when the issue first reached a started state, or null. */
  startedAt: string | null;
  /** Writable due date, "YYYY-MM-DD" or null (date-only — a UTC off-by-one trap). */
  dueDate: string | null;
  state: { name: string } | null;
  assignee: WireUser | null;
  project: WireNamedNode | null;
  projectMilestone: WireNamedNode | null;
}

/** A GitHub actor (PR author / reviewer / requested reviewer). */
export interface WireActor {
  login: string;
}

/** A `reviews.nodes[]` entry: a submitted (or drafted PENDING) review. */
export interface WireReviewNode {
  author: WireActor | null;
  state: GithubReviewState;
  submittedAt: string | null;
}

/** A `timelineItems.nodes[]` review-request event, paired against submissions. */
export interface WireTimelineNode {
  __typename: 'ReviewRequestedEvent' | 'ReviewRequestRemovedEvent';
  createdAt: string;
  requestedReviewer: WireActor | null;
}

/** A `commits.nodes[]` entry — used to derive a PR's start edge. */
export interface WireCommitNode {
  commit: { committedDate: string; authoredDate: string };
}

/** A GitHub pull-request node in the shape `pullRequests.nodes[]` returns. */
export interface WirePullRequestNode {
  number: number;
  title: string;
  state: PullRequestState;
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  updatedAt: string | null;
  /** Head branch — Linear's auto-branch convention embeds the issue identifier here. */
  headRefName: string;
  /** Base branch — for a stacked PR this is the parent PR's head branch, not "main". */
  baseRefName: string;
  url: string;
  author: WireActor | null;
  commits: { nodes: WireCommitNode[] };
  reviews: { nodes: WireReviewNode[] };
  timelineItems: { nodes: WireTimelineNode[] };
}

/** An owner/name pair identifying one of the repos PRs are fetched from. */
export interface RepoRef {
  owner: string;
  name: string;
}
