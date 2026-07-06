// fake-Linear read access: fetch the raw issue nodes the app normalizes FROM.
//
// This is the read half of the Linear API seam (writes — issueCreate / issueUpdate —
// arrive in build step 5). It owns the `issues` query string and returns the wire
// nodes untouched; normalization is `lib/normalize/issues.ts`'s job, so this module
// stays a thin, mockable fetch boundary.

import type { WireIssueNode } from '@/lib/domain/wire';
import { postGraphql } from '@/lib/api/graphql';

/** The fake-Linear GraphQL endpoint (app/api/fake/linear). */
export const LINEAR_ENDPOINT = '/api/fake/linear';

/**
 * The `issues` read query, trimmed to exactly the fields `WireIssueNode` declares —
 * the app-owned wire contract is the single source of truth for what we read.
 */
export const ISSUES_QUERY = `
  query Issues {
    issues {
      nodes {
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
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

/** The `data` shape the `issues` query resolves to. */
interface IssuesQueryData {
  issues: {
    nodes: WireIssueNode[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
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
