// The single GraphQL transport the app talks to the Fake source through.
//
// fake-Linear and fake-GitHub each answer a normal GraphQL POST (same shape as the
// real `api.linear.app` / `api.github.com` endpoints), and both surface failures the
// GraphQL way: HTTP 200 with an `{ errors: [...] }` envelope, not a non-2xx status. So
// this transport throws on `body.errors` as well as on a transport-level failure —
// callers get one `Promise` that either resolves with `data` or rejects with a faithful
// message. Mutations (build step 5) lean on the same throw so a rejected write (e.g. a
// start-date key) reaches the form's catch instead of silently succeeding.

/** A GraphQL error node, as either Fake endpoint returns it under `errors`. */
export interface GraphQLError {
  message: string;
}

/** A GraphQL response envelope: `data` on success, `errors` on failure (or both). */
interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

/**
 * Thrown when a GraphQL request fails — either a non-2xx transport status or an
 * `errors` envelope. `errors` carries the raw error nodes when present, so a caller
 * (e.g. a mutation form) can inspect them rather than only reading the message.
 */
export class GraphQLRequestError extends Error {
  readonly errors: readonly GraphQLError[];

  constructor(message: string, errors: readonly GraphQLError[] = []) {
    super(message);
    this.name = 'GraphQLRequestError';
    this.errors = errors;
  }
}

/**
 * POST a GraphQL query to a Fake-source endpoint and return its `data`, typed as `T`.
 * Throws {@link GraphQLRequestError} on a non-2xx response or an `errors` envelope, so
 * the happy path is always a populated `data`.
 */
export async function postGraphql<T>(
  endpoint: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new GraphQLRequestError(`${endpoint} responded ${response.status}`);
  }

  const body = (await response.json()) as GraphQLResponse<T>;

  if (body.errors && body.errors.length > 0) {
    const message = body.errors.map((error) => error.message).join('; ');
    throw new GraphQLRequestError(message, body.errors);
  }

  if (body.data == null) {
    throw new GraphQLRequestError(`${endpoint} returned no data`);
  }

  return body.data;
}
