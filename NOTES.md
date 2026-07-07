# Notes

A Gantt-style standup board over fake Linear issues + GitHub PRs, built in ordered steps (newest last).

**Throughout:**

- All real logic lives in framework-free, unit-tested `lib/` functions; MobX stores just hold raw state and expose one-line computeds that delegate to them.
- App code never imports the fake source — `lib/domain/roster.ts` (the 6-person team) and `wire.ts` (API shapes) are app-owned; the fake source is only sample input in tests.
- Dates are **UTC everywhere**, so the classic Gantt off-by-one can't happen.
- Jest covers pure functions (no DOM); Storybook is the visual layer. Store-bound organisms skip stories — the sanctioned cut line.
- Status: **290 tests pass**; typecheck, lint, and `next build` clean.

## Step 0 — Theming & tokens

- **One color source:** CSS variables in `globals.css`; Tailwind classes (`bg-primary`) point at them. `<html>` carries three switches — light/dark (`.dark`), accent hue (`[data-accent]`, 6 options), and accent→primary.
- **Contrast checked:** every theme × accent meets WCAG AA; warm accents use dark text. Status colors are fills only, never small text.
- **Theme persists** via `uiStore` + localStorage; an inline script re-applies it before first paint (no flash).

## Step 1 — Domain, normalization & gantt logic (pure, built & tested first)

- **Statuses → buckets:** 12 raw states → 6 color buckets; an unknown state falls back to "planned". Tracks automation-owned (locked) vs writable states.
- **Reviews (hardest part):** per reviewer → `pending` / `completed` / `mooted`. Replay the request/remove history (latest wins), drop bots + outsiders, keep "changes requested" blocking until approve/dismiss (a later comment or re-request doesn't clear it). Compare real timestamps, not text.
- **PR → issue:** match `ORB-###` in the branch, then the title; a keyless stacked PR inherits its parent's issue; an unknown key → visible "orphan", never dropped.
- **Blocked & overdue (Linear has neither):** overdue = past due and not done/canceled; blocked = an open PR with changes requested, or a review waiting > 2 days. Keyed off the PR, not the automation-owned "In Review" state (which lags reality).
- **Spans:** start (planned ?? actual) → end (due ?? today-if-started); neither → the "unscheduled" shelf. Half-open `[start, end)` day ranges with an exclusive end, so same-day and in-progress bars still cover their day. Due-only issues render as a diamond marker.
- **Packing:** `packLanes` fits bars into the fewest non-overlapping rows, preserving priority order (blocked/overdue on top).
- **Edge cases, each with a test:** keyless-chain inheritance; a bar never ends before it starts; a first-day marker stays visible; changes-requested stays blocking; timestamps compared as instants; a PR with its *own* bad key stays orphan; exclusive ends + same-day markers pack separately.

## Step 2 — API layer & data store

- **One transport:** `postGraphql` throws on the fake endpoints' HTTP-200-with-`errors` envelope, so callers assume success and saves catch cleanly.
- **PRs = 6 requests** (2 repos × 3 states) via `Promise.all`; a `NOT_FOUND` repo is logged and skipped, any other error rethrown (never a silently-empty board).
- **`dataStore` holds raw issues/PRs only;** every view is a one-line computed over a `lib/` function. Writes enter via `loadAll()` / `applyIssueNode()`.
- **Memoized normalization:** an edit re-normalizes only the changed issue; unchanged rows keep object identity so the UI can skip them.

## Step 3 — Gantt skeleton

- **Rows are pure** (`buildLanes`): group by person/project, sort by bucket, pack. Person mode shows the whole team (empty lanes included); project mode shows only non-empty projects. No-date issues sit in a per-lane "Unscheduled" shelf.
- **One scale, five densities:** zoom (Week / 2 Weeks / Month / Quarter / Year) sets window span + px/day + track width (tight windows scroll, not crush). Bars are positioned as a % of the track. Labels degrade before bars; the header coarsens day cells → week ticks → month bands.
- **Raw state stays on the bar** (bucket = color, tag = granular state). Due-only → diamond; a bar running past the window edge squares that corner.
- **Controlled molecules, store-connected organisms.** Today's day index is captured once at store creation — no computed calls `new Date()`.

## Step 4 — Attention, PR chips & review panel

- **Attention is derived once** in the pure layer and flows through `ganttRows`. Blocked/overdue **never degrade** at any zoom: blocked = red ring + edge + ⛔; overdue = red hatch + days-overdue badge. Rows sort blocked → overdue → bucket.
- **Lane headers read like a standup line:** a badge cluster `⛔ · ⚠ · ● · ◐ · 👁`; the 👁 badge opens the review panel filtered to that person.
- **PR chips** on the same scale under each bar (first-commit → merged/now) with a review dot (○ pending / ✗ changes / ✓ approved); collapse to a dot at quarter zoom, gone at year.
- **"Needs review" panel:** same pending-review data as the badges, grouped by reviewer, longest-waiting first, stale (> 2d) in red. Bot/outside/mooted requests filtered upstream.
- **Legend** maps each bucket color to its raw states.

## Step 5 — Issue drawer, create modal & mutations

- **Apply-the-response, not optimistic:** `updateIssue` / `createIssue` select the full node; `dataStore` splices it in by id and computeds re-derive. Rejected writes (unknown assignee, forbidden start-date key) surface as inline errors.
- **Edit in place, field by field** (status / assignee / due / title save on change). Status is a dropdown of the full 12-state ladder; the 5 automation states are labeled "(Set by GitHub automation)" and locked as targets — but **Cancel is allowed from any state**. Assignee can't clear to null, so "Unassigned" is a disabled placeholder.
- **App-owned planning state** (`planningStore`: `plannedStarts`, `blockedFlags`), not Linear. Manual "mark blocked" merges with the derived signal via pure `mergeManualBlocked`; planned start feeds the ghost segment. In-memory this step (localStorage persistence is step 6; a `snapshot` getter is ready).
- **Issue detail is a right-side drawer**, the create modal a centered / bottom sheet — both on the shared `ModalSheet` (✕ / backdrop / Escape).
- **Scoped interactions:** only a bar's title row opens the drawer (the PR-chip band stays its own target); each PR chip's hit area is content-width. In "Needs review", the PR id opens GitHub and the issue id opens the drawer.
- **New atoms:** `Select` + `DateInput`, each with a tested util.

### Attention treatments, PR chips & review panel (build step 4)

The standup signals become loud and visible: blocked/overdue treatments on the bars, an
at-a-glance badge cluster per lane, PR chips under each bar, a "Needs review" side panel,
and a legend. This is where the board earns the "run standup fast" goal.

- **Attention is derived once, in the pure layer, and flows through the rows.** `buildLanes`
  now enriches each issue with its derived attention (overdue / blocked) and its resolved
  PRs, so the store's `ganttRows` carries everything the bars and lane headers need. The
  manual "mark blocked" flag is merged into this derived result at the row level (step 5).
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

### Issue popover, create modal & mutation plumbing (build step 5)

Actions without leaving the board: click a bar to edit an issue, "+ New issue" to create one,
both writing through fake-Linear's `issueUpdate` / `issueCreate`.

- **Apply-the-response, not optimistic.** `lib/api/linear.ts` gains `updateIssue` /
  `createIssue`; both select the full issue node via one shared fragment (a mutation reads
  back exactly what a query would), and `dataStore` splices the returned node in by id so
  the board's computeds re-derive. There's no local guessing to reconcile, and a rejected
  write (unknown assignee, the forbidden start-date key) rejects through `postGraphql` into
  the form's `catch` as a faithful inline error rather than a silent no-op.
- **The popover edits in place, field by field.** Status / assignee / due date / title save
  the moment they change (Linear-style), showing a "Saving…" / error line. Automation-owned
  states render locked with a "set by GitHub automation" hint — the status select offers the
  full 12-state ladder but only the 7 writable states are selectable. Assignee can't be
  cleared to null (fake-Linear rejects it), so "Unassigned" is a disabled placeholder.
- **Planned start & "mark blocked" are app-owned** — they live in the new `planningStore`
  (`plannedStarts`, `blockedFlags`), not Linear. The manual blocked flag is merged with the
  derived signal by the pure `mergeManualBlocked`, so a bar reads blocked from either source
  (the popover also surfaces the derived "Auto-flagged: …" reason separately). Planned start
  feeds the ghost segment via the existing `computeSpan`. **The store is in-memory this
  step; its localStorage persistence is wired in step 6** (it already exposes a `snapshot`).
- **Shared `ModalSheet` shell.** Both surfaces reuse one dismissible container (✕ / backdrop
  / Escape), centered on `sm+` and docked as a bottom sheet on small screens — the
  breakpoint-switched container the responsive plan calls for, ready ahead of step 7.
- **New atoms.** `Select` (native, so device pickers and keyboard behaviour come free) and
  `DateInput` (emits the app's "YYYY-MM-DD"-or-null shape, with an inline clear), each with a
  tested pure util.
- **PR deep-links.** Bar/shelf clicks open the popover; PR chips and review-panel rows now
  open the PR on GitHub (`window.open`), closing the "rows deep-link to the PR" loop.
- **Verification.** Typecheck and lint clean (only a pre-existing seed-test warning); 270
  unit tests pass — new ones cover the mutation option lists (status ladder, assignee
  placeholder, create-input mapping) and the manual-blocked merge. Consistent with the
  step-3/4 decision, the store-bound organisms (popover, modal) have no standalone stories;
  their logic lives in tested pure utils, and the new atoms + `ModalSheet` do get stories.

## Tradeoffs / what you'd do next

- Known rough edges or incomplete areas.
- What you would improve with more time.
- Any assumptions you made about the product or data.

## AI tool usage

- Which tools you used.
- How you directed them, where you pushed back, and what you changed by hand.
- How you verified the generated code or designs.
