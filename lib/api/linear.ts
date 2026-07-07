// fake-Linear read + write access: fetch the raw issue nodes the app normalizes FROM,
// and apply the writes Linear allows (create / update). It owns the query + mutation
// strings and returns the wire nodes untouched; normalization is
// `lib/normalize/issues.ts`'s job, so this module stays a thin, mockable fetch
// boundary. Writes follow the apply-the-response model: fake-Linear returns the
// complete updated node, which the data store splices in by id.

import type { WireIssueNode } from '@/lib/domain/wire';
import { postGraphql } from '@/lib/api/graphql';

/** The fake-Linear GraphQL endpoint (app/api/fake/linear). */
export const LINEAR_ENDPOINT = '/api/fake/linear';

/**
 * The issue-node selection every read and mutation shares — exactly the fields
 * `WireIssueNode` declares, so the app-owned wire contract is the single source of
 * truth for what we read back (a mutation returns the same full node a read would).
 */
const ISSUE_NODE_FIELDS = `
  id
  identifier
  title
  url
  startedAt
  dueDate
  state { name }
  assignee { id name displayName email }
  project { id name }
  projectMilestone { id name }
`;

/** The `issues` read query, trimmed to exactly the wire-contract fields. */
export const ISSUES_QUERY = `
  query Issues {
    issues {
      nodes {${ISSUE_NODE_FIELDS}}
      pageInfo { hasNextPage endCursor }
    }
  }
`;

/** The `issueUpdate` mutation — patches an existing issue and returns the full node. */
export const ISSUE_UPDATE_MUTATION = `
  mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue {${ISSUE_NODE_FIELDS}}
    }
  }
`;

/** The `issueCreate` mutation — creates an issue and returns the full node. */
export const ISSUE_CREATE_MUTATION = `
  mutation IssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {${ISSUE_NODE_FIELDS}}
    }
  }
`;

/**
 * The writable fields of an issue update. `stateId` carries a state *name* (fake-Linear
 * mints no separate state ids); `assigneeId` takes a Linear user id or email; a `null`
 * `dueDate` clears it, an absent key leaves it alone. There is deliberately no start-date
 * key — Linear has none, and fake-Linear rejects any attempt to write one.
 */
export interface IssueUpdateInput {
  title?: string;
  assigneeId?: string;
  dueDate?: string | null;
  stateId?: string;
}

/** The fields accepted when creating an issue (`title` is required). */
export interface IssueCreateInput {
  title: string;
  assigneeId?: string;
  dueDate?: string | null;
  stateId?: string;
}

/** The `data` shape the `issues` query resolves to. */
interface IssuesQueryData {
  issues: {
    nodes: WireIssueNode[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

/** The `data` shape an `issueUpdate` / `issueCreate` mutation resolves to. */
interface IssueMutationData {
  issueUpdate?: { success: boolean; issue: WireIssueNode };
  issueCreate?: { success: boolean; issue: WireIssueNode };
}

/**
 * Fetch every issue from fake-Linear as raw wire nodes. The Fake source serves the
 * whole set on one unpaginated page, so no cursor loop is needed. Rejects (via
 * {@link postGraphql}) on a transport or GraphQL error.
 */
export async function fetchIssues(): Promise<WireIssueNode[]> {
  const data = await postGraphql<IssuesQueryData>(LINEAR_ENDPOINT, ISSUES_QUERY);
  return data.issues.nodes;
}

/**
 * Apply an update to one issue and return the complete updated node. Rejects (via
 * {@link postGraphql}) on a rejected write — e.g. an unknown assignee or a start-date
 * key — so a caller's `try/catch` shows the faithful error rather than a silent no-op.
 */
export async function updateIssue(
  id: string,
  input: IssueUpdateInput,
): Promise<WireIssueNode> {
  const data = await postGraphql<IssueMutationData>(LINEAR_ENDPOINT, ISSUE_UPDATE_MUTATION, {
    id,
    input,
  });
  return data.issueUpdate!.issue;
}

/**
 * Create an issue and return the complete new node. Rejects (via {@link postGraphql})
 * on a rejected write — e.g. a blank title or an unknown assignee.
 */
export async function createIssue(input: IssueCreateInput): Promise<WireIssueNode> {
  const data = await postGraphql<IssueMutationData>(LINEAR_ENDPOINT, ISSUE_CREATE_MUTATION, {
    input,
  });
  return data.issueCreate!.issue;
}
