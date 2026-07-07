# Notes

A short writeup to submit with your repo. Keep it brief: a page or two is plenty.

## Decisions

- What you chose to build, what you deliberately left out, and why.
- How you modeled issues, pull requests, reviews, statuses, and timeline spans.
- Where you put app-owned state, such as lane placement or planned starts, and how you
  reasoned about it.

### Theming & design tokens (build step 0)

- **One source of truth for colors.** Colors are CSS variables in `app/globals.css`, and
  `tailwind.config.ts` points classes like `bg-primary` at those variables. Change a
  color once and it updates everywhere.
- **Three independent switches on `<html>`:** light/dark theme (`.dark` class), a
  swappable accent color (`[data-accent]` — indigo by default, plus five others), and the
  accent feeds the primary color.
- **Contrast is checked.** Every theme + accent combo meets WCAG AA (4.5:1) for text on
  buttons. Warm accents (amber/emerald/sky) use dark text instead of white so they stay
  readable. Status colors are fills for bars/badges/dots, not for small text.
- **Theme is remembered.** `uiStore` holds the theme + accent, saves them to localStorage,
  and a tiny inline script re-applies the saved theme before the first paint so there's no
  flash of the wrong theme on load. The visible switcher UI comes in a later step.
- **Tests.** Jest runs any `*.test.ts` / `*.test.tsx` under `lib/` and `components/`.
  Everything tested so far is pure functions, so no browser is needed — Storybook covers
  the visual side.

### Domain, normalization & gantt logic (build step 1)

This is the pure logic that turns messy API data into something the board can draw — no
React or MobX, just functions that take data and return data, all unit-tested. Building
it first (before any UI) is where the tricky date and edge-case bugs get caught.

- **We keep our own roster and data shapes.** The fake Linear/GitHub source stands in for
  real external services, so app code never imports from it. `lib/domain/roster.ts` has
  our own copy of the 6-person team (email ↔ GitHub login), and `lib/domain/wire.ts`
  describes the API shapes we read. Tests use the fake data only as sample input.
- **Statuses → colors.** `lib/domain/states.ts` groups Linear's 12 raw states into 6
  buckets (the colors on the board). An unknown state falls back to "planned" instead of
  crashing. It also tracks which states automation controls (locked in the editor) and
  which we're allowed to write.
- **Reviews (the hardest part).** For each PR we work out where each reviewer stands:
  still waiting (`pending`), done (`completed`), or no longer relevant because the PR
  closed (`mooted`). We replay the request/remove history (latest wins), ignore bots and
  outside contributors, and treat "changes requested" as still blocking until the
  reviewer approves or dismisses — even if they later just leave a comment, or are
  re-requested for a fresh review (a pending re-review doesn't clear the standing
  verdict). Times are compared as real dates, not text, so timestamp formatting can't
  trip it up.
- **Matching PRs to issues.** We read the issue ID (like `ORB-104`) from the branch name
  first, then the title. A stacked PR (built on another PR's branch) inherits its parent's
  issue when it has none of its own. An unknown ID becomes a visible "orphan" rather than
  being silently dropped.
- **Blocked & overdue.** Linear has no "blocked" or "overdue" flag, so we compute them:
  overdue = past its due date and not done/canceled; blocked = an open PR with changes
  requested, or a review left waiting more than 2 days (on any unfinished issue — we key
  off the PR, not Linear's automation-owned "In Review" state, which can lag the real PR
  status). A manual "mark blocked" toggle gets merged in later at the store level.
- **Timeline spans.** A bar runs from its start (planned start if set, otherwise the real
  start) to its end (due date, or today if it's in progress). No start and no due date → it
  goes on the "unscheduled" shelf. Both the planned and actual start are kept so the gap
  between them can show plan-vs-reality. Spans are half-open day ranges `[start, end)`, and
  the end is made exclusive so a bar covers whole calendar days — a task started and due the
  same day is one day wide, and in-progress work covers today's column. An issue with only a
  due date shows as a point marker (but still claims its day so two same-day markers don't
  overlap).
- **Dates use UTC everywhere.** A date-only due date and a full timestamp on the same day
  map to the same "day number," so the classic Gantt off-by-one bug can't happen.
- **Stacking bars into rows.** `packLanes` fits a lane's bars into as few rows as possible
  without overlaps, keeping the caller's priority order (blocked/overdue on top).

- **Edge cases found in review (each fixed with a test):**
  1. A keyless stacked PR whose parent is *also* keyless now finds its issue by following
     the chain up to the first PR that has one.
  2. A bar can never end before it starts — e.g. an issue started after it was already
     overdue. Overdue is still flagged separately.
  3. A single-day marker (an issue with only a due date) shows up even when it sits on the
     very first day of the view.
  4. A "changes requested" review stays blocking until the reviewer approves/dismisses —
     a later comment, or a re-request for fresh review, doesn't clear it.
  5. Review *and* commit times are compared as real instants (not text), so mixed
     timezone offsets / precisions can't mis-order a pairing or pick the wrong first commit.
  6. A stacked PR with its *own* stale/typo issue key stays an orphan instead of borrowing
     its parent's issue; only truly keyless PRs inherit.
  7. Bar ends are exclusive so same-day and in-progress bars cover their last day, and
     same-day due-only markers pack into separate rows instead of drawing on top of each other.

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
- **One missing repo doesn't fail the load — but real errors do.** A not-found repo still
  returns HTTP 200 with a `NOT_FOUND` error; we log it and skip just that slice, so the
  board loads with the rest. Any other failure (transport, schema, outage) is rethrown
  rather than swallowed — otherwise the load would look `ready` with missing PRs and the
  board would seem empty of review work.
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

### Gantt skeleton (build step 3)

The first real UI: the timeline canvas with grouped swimlanes, bars, a date header, a
today line, and the grouping + zoom controls. Attention treatments, PR chips, the state
filter, the detail popover, and mutations are deliberately still to come (steps 4–6).

- **Rows are pure, the store just delegates.** `lib/gantt/rows.ts` (`buildLanes`) turns
  normalized issues into swimlanes: group by person or project, sort each lane by status
  bucket, then pack into non-overlapping rows with the existing `packLanes`. No-date issues
  can't sit on the timeline, so they render in a compact per-lane "Unscheduled" shelf below
  the bars (visible and selectable — scheduling happens in the detail popover) rather than
  vanishing while still counted in the lane header. The store exposes this as one computed
  (`ganttRows`) that just calls the function — all the logic stays unit-tested.
- **Person mode shows the whole team; project mode only shows active projects.** For
  standup, every teammate gets a lane even with zero issues (so nobody is invisible), with
  an "Unassigned" lane appended only when needed. Projects are derived from the issues, so
  empty ones don't clutter; "No project" sorts last.
- **One scale, drawn at five densities.** The zoom (Week/2 Weeks/Month/Quarter/Year) picks
  the window span and a pixels-per-day (`lib/gantt/density.ts`), which sets the timeline track
  width so tight windows scroll horizontally instead of crushing. Bars are positioned as
  percentages of that track, so the same components render at every zoom. Labels degrade
  before bars do — a rule encoded as a pure `shouldShowBarLabel` threshold; the header
  swaps day cells → week ticks → month bands as it coarsens.
- **Raw state stays on the bar.** Buckets drive the color, but each bar still shows its
  granular Linear state (e.g. "On Staging") as a tag — the hybrid the plan calls for. A
  due-only issue collapses to a diamond marker; bars that run past the window edge square
  off that corner so they read as continuing.
- **Controlled molecules, store-connected organisms.** The toggle, zoom controls, bars,
  and header take plain props (so Storybook can drive them and they stay testable); only
  the organisms (`Toolbar`, `GanttBoard`, `GanttApp`) read the store via context and wire
  callbacks to actions. Today's day index is captured once at store creation, so no
  computed ever calls `new Date()`.
- **Verification.** Typecheck, lint, and `next build` are clean; 195 unit tests pass
  (grouping/packing, density thresholds, header geometry, bar placement + clipping).
  Storybook covers the visual matrix (every bucket, marker, clipped bar, each zoom's
  header). Stories for the store-connected organisms are the sanctioned cut line and are
  deferred. Full DOM render tests remain out of scope (no jsdom), per the step-0 decision.

### Attention treatments, PR chips & review panel (build step 4)

The standup signals become loud and visible: blocked/overdue treatments on the bars, an
at-a-glance badge cluster per lane, PR chips under each bar, a "Needs review" side panel,
and a legend. This is where the board earns the "run standup fast" goal.

- **Attention is derived once, in the pure layer, and flows through the rows.** `buildLanes`
  now enriches each issue with its derived attention (overdue / blocked) and its resolved
  PRs, so the store's `ganttRows` carries everything the bars and lane headers need. The
  manual "mark blocked" flag isn't wired yet (it lives in `planningStore`, step 6) — only
  the derived signals show for now.
- **Blocked and overdue never degrade.** Labels and PR chips thin out as you zoom out, but
  the red treatments stay at every zoom (they're the whole point). Blocked gets a red ring +
  thick red left edge + ⛔; overdue gets a red diagonal hatch + a clock badge counting days
  past due. If an issue is both, the blocked ring wins the outline and the overdue hatch +
  badge still layer on. Rows sort attention-first: blocked → overdue → then status bucket.
- **Lane headers read like a standup line.** The badge cluster (`⛔ 1 · ⚠ 1 · ● 2 · ◐ 1 ·
  👁 3`) is tallied from the lane's own members; the 👁 reviews-waiting badge is a button
  that opens the review panel filtered to that person. The badges alone let you run standup
  without reading a single bar.
- **PR chips sit on the same scale as the bar.** Each PR is a thin chip under its issue,
  spanning first-commit → merged/closed/now, with a review-state dot (○ pending, ✗ changes
  requested, ✓ approved). Stacked PRs indent with a dashed edge. Chips collapse to just the
  dot at quarter zoom and drop out entirely at year (detail lives in the popover) — the bar
  itself never does.
- **"Needs review" panel, grouped by reviewer, staleness first.** The panel reuses the same
  pending-review data as the lane badges (so the two can't disagree), groups by reviewer,
  and sorts so the requests that have waited longest lead; stale (> 2 days) ages are red.
  Opened either from the toolbar (full list) or a lane's 👁 badge (filtered to that person,
  with a "Show all" escape). Bot/outside/mooted requests are already filtered upstream.
- **Legend.** A compact strip maps each bucket color to the raw states it covers (so the
  granular states stay discoverable) plus the blocked/overdue key.
- **Verification.** Typecheck, lint, and `next build` are clean; 224 unit tests pass (the
  new ones cover attention-first sorting + lane summaries, the badge cluster, PR-chip
  geometry + review dots, and review-group staleness ordering). Storybook covers the new
  visual states (blocked/overdue/both bars, every PR-chip review state + dot mode, the badge
  cluster, the legend). The `ReviewAttentionPanel` reads the store, so — consistent with the
  step-3 decision — it has no standalone story; its logic lives in a tested pure util.

## Tradeoffs / what you'd do next

- Known rough edges or incomplete areas.
- What you would improve with more time.
- Any assumptions you made about the product or data.

## AI tool usage

- Which tools you used.
- How you directed them, where you pushed back, and what you changed by hand.
- How you verified the generated code or designs.
