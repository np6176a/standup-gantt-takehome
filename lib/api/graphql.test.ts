import { GraphQLRequestError, postGraphql } from '@/lib/api/graphql';

/** Build a minimal `fetch` Response stub with the fields postGraphql reads. */
function mockResponse(body: unknown, { ok = true, status = 200 } = {}): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe('postGraphql', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns the `data` payload on success', async () => {
    global.fetch = jest.fn(async () => mockResponse({ data: { issues: { nodes: [] } } }));

    const data = await postGraphql<{ issues: { nodes: unknown[] } }>('/api/fake/linear', 'query {}');

    expect(data).toEqual({ issues: { nodes: [] } });
  });

  it('sends the query and variables as a JSON POST body', async () => {
    const fetchMock = jest.fn(async () => mockResponse({ data: { ok: true } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await postGraphql('/api/fake/github', 'query Q {}', { owner: 'orbital' });

    const [endpoint, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(endpoint).toBe('/api/fake/github');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      query: 'query Q {}',
      variables: { owner: 'orbital' },
    });
  });

  it('throws with the joined messages on an `errors` envelope (HTTP 200)', async () => {
    global.fetch = jest.fn(async () =>
      mockResponse({ errors: [{ message: 'bad state' }, { message: 'also this' }] }),
    );

    await expect(postGraphql('/api/fake/linear', 'mutation {}')).rejects.toThrow('bad state; also this');
  });

  it('preserves the raw error nodes on the thrown error', async () => {
    global.fetch = jest.fn(async () => mockResponse({ errors: [{ message: 'nope' }] }));

    await expect(postGraphql('/api/fake/linear', 'mutation {}')).rejects.toMatchObject({
      name: 'GraphQLRequestError',
      errors: [{ message: 'nope' }],
    });
  });

  it('throws on a non-2xx transport status', async () => {
    global.fetch = jest.fn(async () => mockResponse('', { ok: false, status: 500 }));

    await expect(postGraphql('/api/fake/linear', 'query {}')).rejects.toBeInstanceOf(GraphQLRequestError);
  });

  it('throws when the response has neither data nor errors', async () => {
    global.fetch = jest.fn(async () => mockResponse({}));

    await expect(postGraphql('/api/fake/linear', 'query {}')).rejects.toThrow('no data');
  });
});
