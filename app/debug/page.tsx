'use client';

// THROWAWAY debug view (build step 2) — not part of the shipped Gantt.
//
// It drives dataStore.loadAll and renders the normalized JOINS so they can be eyeballed
// before any real UI exists: Linear issue ⇄ roster assignee (email join), issue ⇄ its
// PRs (branch/title resolution), PR author/reviewer ⇄ roster (login join, bot/outsider
// filtered), orphan PRs, pending reviews per person, and the state-filter counts. Delete
// once the real board renders the same data.

import { useContext, useEffect } from 'react';
import { observer } from 'mobx-react-lite';

import { StoreContext } from '@/stores/StoreProvider';
import type { PullRequest } from '@/lib/normalize/pullRequests';
import { prKey } from '@/lib/normalize/pullRequests';

/** One-line summary of a PR's review outcomes, e.g. "dana:pending, theo:completed". */
function reviewSummary(pr: PullRequest): string {
  if (pr.reviewOutcomes.length === 0) return '—';
  return pr.reviewOutcomes
    .map((outcome) => `${outcome.reviewer.displayName}:${outcome.status}`)
    .join(', ');
}

/** Compact one-line description of a PR for the debug list. */
function prLine(pr: PullRequest): string {
  const author = pr.author ? pr.author.displayName : `${pr.authorLogin ?? '?'} (off-roster)`;
  const changes = pr.hasChangesRequested ? ' ⚠changes-requested' : '';
  return `#${pr.number} [${pr.repo.name}/${pr.state}] by ${author} · reviews: ${reviewSummary(pr)}${changes}`;
}

const cell: React.CSSProperties = {
  border: '1px solid var(--color-border)',
  padding: '0.4rem 0.6rem',
  textAlign: 'left',
  verticalAlign: 'top',
};

const DebugContent = observer(() => {
  const store = useContext(StoreContext);

  useEffect(() => {
    if (store && store.data.status === 'idle') store.data.loadAll();
  }, [store]);

  if (!store) return <p>No store.</p>;

  const { data } = store;

  if (data.status === 'loading' || data.status === 'idle') return <p>Loading…</p>;
  if (data.status === 'error') {
    return <pre style={{ color: 'var(--color-attention-overdue)' }}>Error: {data.error}</pre>;
  }

  return (
    <>
      <p>
        Loaded <strong>{data.issues.length}</strong> issues,{' '}
        <strong>{data.pullRequests.length}</strong> PRs (
        {data.orphanPullRequests.length} orphan), {data.people.length} people.
      </p>

      <h2>Issue counts by state</h2>
      <ul>
        {Object.entries(data.issueCountByState)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([state, count]) => (
            <li key={state}>
              {state}: {count}
            </li>
          ))}
      </ul>

      <h2>Issues → assignee, PRs</h2>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={cell}>Issue</th>
            <th style={cell}>State / bucket</th>
            <th style={cell}>Assignee (login)</th>
            <th style={cell}>Started / Due</th>
            <th style={cell}>PRs</th>
          </tr>
        </thead>
        <tbody>
          {data.issues.map((issue) => {
            const prs = data.prsByIssueId.get(issue.id) ?? [];
            return (
              <tr key={issue.id}>
                <td style={cell}>
                  {issue.identifier} — {issue.title}
                </td>
                <td style={cell}>
                  {issue.stateName} / {issue.bucket}
                  {issue.automationOwned ? ' 🔒' : ''}
                </td>
                <td style={cell}>
                  {issue.assignee
                    ? `${issue.assignee.displayName} (${issue.assignee.githubLogin || '—'})`
                    : '—'}
                </td>
                <td style={cell}>
                  {issue.startedAt?.slice(0, 10) ?? '—'} / {issue.dueDate ?? '—'}
                </td>
                <td style={cell}>
                  {prs.length === 0 ? (
                    '—'
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                      {prs.map((pr) => (
                        <li key={prKey(pr.repo, pr.number)}>{prLine(pr)}</li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Orphan PRs (resolved to no issue)</h2>
      {data.orphanPullRequests.length === 0 ? (
        <p>None.</p>
      ) : (
        <ul>
          {data.orphanPullRequests.map((pr) => (
            <li key={prKey(pr.repo, pr.number)}>
              {prLine(pr)} · head={pr.headRefName} · title=&quot;{pr.title}&quot;
            </li>
          ))}
        </ul>
      )}

      <h2>Pending reviews by person</h2>
      <ul>
        {data.people.map((person) => {
          const pending = data.pendingReviewsByPersonId.get(person.id) ?? [];
          return (
            <li key={person.id}>
              {person.displayName} ({person.githubLogin}): {pending.length}
              {pending.length > 0
                ? ` — ${pending.map((review) => `#${review.pr.number}`).join(', ')}`
                : ''}
            </li>
          );
        })}
      </ul>
    </>
  );
});

export default function DebugPage() {
  return (
    <main
      style={{
        fontFamily: 'ui-monospace, monospace',
        padding: '2rem',
        lineHeight: 1.5,
        color: 'var(--color-text-primary)',
      }}
    >
      <h1>Debug: normalized joins (throwaway)</h1>
      <DebugContent />
    </main>
  );
}
