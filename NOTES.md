# Notes

A short writeup to submit with your repo. Keep it brief: a page or two is plenty.

## Decisions

- What you chose to build, what you deliberately left out, and why.
- How you modeled issues, pull requests, reviews, statuses, and timeline spans.
- Where you put app-owned state, such as lane placement or planned starts, and how you
  reasoned about it.

### Theming & design tokens (build step 0)

- Colors are defined once as CSS variables in `app/globals.css` and wired into Tailwind,
  so classes like `bg-primary` and `bg-status-active` just work.
- Three independent switches on `<html>`: `.dark` (light/dark), `[data-accent]` (primary
  hue — indigo by default, plus five others), and the accent drives `--color-primary`.
- Every primary-fill + text pair meets WCAG AA contrast (≥ 4.5:1) in both themes (checked;
  rose is the lowest at 4.70). Warm accents (amber/emerald/sky) use dark text instead of
  white. Status colors are for fills — bars, badges, dots — not for small text.
- `uiStore` holds `theme` + `accent`; `StoreProvider` copies them to `<html>` and saves
  them to localStorage. A small inline script in the layout applies the saved theme before
  the first paint, so there's no flash. The visible switcher UI comes later.
- Widened Jest's `testMatch` so per-component tests run too. Tests are pure functions
  (node env); DOM render tests are out of scope — Storybook is the visual check.

### Domain, normalization & gantt scale (build step 1)

All pure and unit-tested under `lib/` before any UI — the highest-value work, and where
off-by-one and edge-case bugs hide.

- **The app owns its own roster and types.** App code never imports the fake source's
  `TEAM` (it stands in for an external system). `roster.ts` has a hand-copied
  email→GitHub-login map, with a test that flags any drift from `TEAM`; `wire.ts` declares
  the external API shapes we read. Tests use the seed only as sample data.
- **Statuses map to buckets.** `states.ts` maps the 12 raw states to 6 buckets and never
  throws on an unknown state (falls back to `planned`). It also lists the 5
  automation-locked states and the 7 writable ones. The raw state name is always kept.
- **Reviews (the trickiest part).** `pairReviews` returns one result per reviewer: replay
  the request/remove events (last one wins) and match the open request to a submission.
  Answered → `completed`; unanswered on a closed/merged PR → `mooted`, otherwise
  `pending`; a review with no request → `completed` (drive-by). Bots and outside
  contributors are dropped first.
- **Linking PRs to issues.** Look for `ORB-###` in the branch name, then the title, and
  accept it only if that issue exists — otherwise the PR is shown as an orphan, not
  dropped. A stacked PR inherits its parent's issue.
- **Blocked and overdue are computed by the app.** Linear has neither. Overdue = past due
  and not done/canceled. Blocked = an open PR with changes requested, or a review left
  pending more than 2 days on an In Review issue. The manual "mark blocked" flag lives in
  `planningStore` (later).
- **Timeline spans and the UTC rule.** A span starts at the planned start (or the actual
  start) and ends at the due date (or today); no start and no due date → unscheduled shelf.
  Everything uses whole-UTC-day numbers, so a date-only due date and a full-timestamp start
  on the same day line up — this avoids the most common Gantt off-by-one.
- **Lane packing.** `packLanes` fills rows greedily in the order it's given, so the
  caller's priority (blocked/overdue first) is preserved.
- **Bugs caught in review (fixed and tested):** (1) a stacked PR whose parent is also
  unlinked now follows the chain up to the linked one; (2) a span can never come out
  backwards, even if the due date is before the start; (3) a zero-length due-only marker
  on the window's first day now shows.

### API layer & data store (build step 2)

How the app fetches data, and the store that holds it and hands out ready-to-use views.

- **One place to talk to the server.** Every request goes through `postGraphql` in
  `lib/api/graphql.ts`. Both fake endpoints report failure with HTTP 200 plus an `errors`
  field in the body, so `postGraphql` checks for that and throws — the rest of the app can
  assume success once a call returns, and a failed save is easy to catch. `linear.ts`
  reads issues; `github.ts` reads pull requests.
- **Reading PRs takes 6 requests.** Fake-GitHub answers one repo and one state at a time,
  so we ask for every combination (2 repos × 3 states) at once with `Promise.all`, tagging
  each PR with the repo it came from.
- **The repo list belongs to the app,** not the fake source — the same choice as the roster.
- **One missing repo doesn't fail the load.** A not-found repo still returns HTTP 200 with
  an error; we log it and skip just that slice, so the board loads with the rest.
- **The store holds raw data and derives the rest.** `dataStore` keeps only the raw issues
  and PRs plus a status flag; every view (issues, pull requests, PRs grouped by issue,
  pending reviews per person, counts per state) is a one-line getter over a pure `lib/`
  function. Data comes in through `loadAll()` and `applyIssueNode()` (drop an updated issue
  back in by id after a save).
- **Throwaway `/debug` page** runs `loadAll` and prints the joined data so it can be
  eyeballed before any real UI exists. Checked live: 32 issues (all 30 assigned match a
  teammate) and 40 PRs (30 link to an issue, the rest shown as orphans, not dropped).
  Delete it once the board shows the same thing.
- **Tests** fake the network to check two things: a call throws when the body has errors,
  and the PR read fires 6 requests and skips a missing repo. The store is just glue,
  already covered by the `lib/` tests.
- **Faster issue re-normalizing.** `normalizeIssuesMemoized` caches the result for each raw
  issue, so after an edit only the changed issue is recomputed and unchanged rows keep the
  same result (the UI can skip redrawing them). This is safe because a save replaces the
  whole issue object, so "same object" means "unchanged." *Still to do:* the later steps
  (PRs, sorting, packing, grouping) are still redone from scratch — fine at this size,
  worth revisiting if the data grows. PRs need a smarter cache, because a PR's issue link
  depends on the other PRs and the current set of issue ids, not just that one PR.

## Tradeoffs / what you'd do next

- Known rough edges or incomplete areas.
- What you would improve with more time.
- Any assumptions you made about the product or data.

## AI tool usage

- Which tools you used.
- How you directed them, where you pushed back, and what you changed by hand.
- How you verified the generated code or designs.
