# Notes

A Gantt-style standup board over fake Linear issues + GitHub PRs, built in ordered steps (newest last).

**Throughout:**

- All real logic lives in framework-free, unit-tested `lib/` functions; MobX stores just hold raw state and expose one-line computeds that delegate to them.
- App code never imports the fake source — `lib/domain/roster.ts` (the 6-person team) and `wire.ts` (API shapes) are app-owned; the fake source is only sample input in tests.
- Dates are **UTC everywhere**, so the classic Gantt off-by-one can't happen.
- Jest covers pure functions (no DOM); Storybook is the visual layer. Store-bound organisms skip stories — the sanctioned cut line.
- Status: **318 tests pass**; typecheck, lint, and `next build` clean.

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

## Step 6 — State filter, attention chip & planning persistence

- **State filter with live counts:** the toolbar "States" popover lists all 12 raw states grouped by bucket, each a checkbox with a live issue count (a MobX computed, so it re-tallies after every mutation). Per-bucket and per-state toggles, show-all / reset, and a badge on the button showing how many states are hidden. Defaults hide Backlog / Triage / Canceled.
- **Attention chip:** a board-wide blocked/overdue rollup in the toolbar; clicking it toggles an "attention-only" filter that narrows the board to just the flagged issues.
- **Both filters apply upstream** in `buildLanes` (state visibility + attention-only) before grouping/packing, so the counts, the lanes, and the badges can't disagree.
- **Planning persists:** `planningStore` restores its snapshot (planned starts + manual blocked flags) from localStorage on boot and a single `reaction` writes changes back — so "I'm blocked" and a hand-set planned start survive a reload. A follow-up hardened the restore path to normalize a non-string blocked reason.

## Step 7 — Polish: responsive, loading & density

- **One variable drives the rail width.** `--rail-width` (220 px desktop → 160 px tablet → 56 px mobile) feeds the sticky rail, the today-line offset, and the shelves' sticky-left in lockstep, so they never drift as the layout narrows — a pure-CSS responsive story with no JS breakpoint state.
- **The rail collapses to an avatar strip on mobile.** Below `sm` the lane header hides its title and full badge cluster and shows the loud signals (blocked / overdue / reviews-waiting) as stacked dots under the avatar, so you can still read who needs attention on a 375 px screen. The full cluster returns at `sm+`.
- **The toolbar condenses into stacked rows on mobile.** Below `sm` the single wrapping row breaks into four full-width rows — Standup + grouping, the zoom/Today window, States + attention, Needs-review + New-issue — with the controls stretching to fill each row; the theme/color switcher and the legend hide. Each row wrapper is `sm:contents`, so on desktop it dissolves and the children flow back into the original single wrapping row unchanged (no duplicated markup, no JS).
- **Sheets already breakpoint-switch.** The `ModalSheet` (built in step 5) centers on `sm+` and docks as a bottom sheet on mobile; the issue drawer is a full-height side drawer — so the popover and create modal came responsive for free.
- **Loading gate gets a real spinner.** New `Spinner` atom (inherits `currentColor`, `role="status"` + sr-only label, tested util) replaces the bare loading text; error (with retry) and empty gates were already in place.
- **Density degrades, attention never does.** Confirmed the zoom table still holds after the responsive pass: labels → PR chips → chip-dots drop out as you zoom toward Year, but bars and the red blocked/overdue treatments render at every zoom.
- **Verification:** 318 unit tests pass (new: the mobile attention-dot selection + the spinner dimensions); typecheck, lint (only the pre-existing seed-test warning), and `next build` clean.

## Step 8 — Delete, blocked-icon placement & the due-only page card

- **Delete an app-created issue.** The detail popover offers a delete (with an inline confirm) only for issues *created through this app* that carry *no PR* — a real seeded issue, or one a PR now resolves to, is never removable. Which ids the app created is app-owned state, tracked in `planningStore.createdIssueIds` (persisted alongside planned starts / blocked flags), so the affordance survives a reload. Delete goes through fake-Linear's `issueDelete` (apply-the-response: the raw node is dropped only after the server confirms), then forgets the issue's planned-start / blocked / created-id so nothing dangles.
- **Blocked icon moved to the state.** The ⛔ `ErrorOctagon` now sits beside the bar's "Blocked" state tag (right cluster) instead of prefixing the title — it still renders at every zoom (with the ring), so blocked never degrades.
- **Due-only issues render as a page card, not a diamond.** An issue with a due date but no start (nothing to span) now shows a small bordered card with a `Page` icon in place of the old diamond marker, colored by bucket (red under blocked/overdue). `BucketTreatment.markerCardClass` + `markerCardColorClass` replace the old fill helper (tests updated).
- **State filter persists.** The toolbar's "States" selections are a UI preference now, saved to localStorage (`standup-gantt.stateFilter`) and layered over the defaults on boot, so a state a stored map doesn't mention keeps its default. Persisted by the same reaction pattern as theme/planning.
- **Mobile lane labels stay distinguishable (PR review).** On the collapsed avatar rail, non-person lanes (projects, "No project", "Unassigned") used to share one `#` glyph. They now show the title's initials (`laneGlyph`, mirroring person avatars) and every lane carries an always-present sr-only title, so project swimlanes are distinct visually and to screen readers on mobile.

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

**Assumptions about the data / product**

- **Blocked is app-owned.** Fake-Linear has no "Blocked" state, so blocked is derived (open PR with changes-requested, or a pending review > 2 days on an In-Review issue) unioned with a manual flag stored client-side. The derived signal is keyed off the *PR*, not the automation-owned "In Review" state, which lags reality.
- **Planned start is local-only.** Linear only exposes actual `startedAt` (automation-stamped, read-only) and a writable `dueDate`; there's no planned-start field and start-date writes are rejected. So planned start lives in `planningStore` (localStorage), and the ghost-vs-solid gap on a bar *is* the plan-vs-reality answer.
- **App code never imports the fake source.** The fake source impersonates an external system, so the 6-person roster (`lib/domain/roster.ts`) and the API wire shapes are transcribed into app-owned modules; the fake source is only sample input in tests.
- **Dates are UTC everywhere** — date-only `dueDate` vs full-ISO timestamps is the classic Gantt off-by-one, so day boundaries are computed in UTC throughout.

**Known rough edges / what I'd do next**

- **Mobile toolbar condenses but doesn't yet use a bottom-sheet filter.** The controls now stack into four full-width rows (and the theme switcher + legend hide), which is very usable at 375 px, but the plan's furthest treatment — collapsing State-filter + attention behind a single filter icon that opens a bottom sheet — is still deferred.
- **Mobile avatar rail is display-only.** It shows the loud attention signals as dots but doesn't yet tap-to-expand the full badge cluster inline; the review panel is only reachable from the toolbar at that width.
- **No DOM render tests.** Per the 10 h scope, Jest covers the pure `lib/` + `*Util.ts` logic and Storybook is the visual layer; store-bound organisms have no standalone stories (a sanctioned cut). Adding jsdom + Testing Library for the interactive flows (mutation forms, filter toggles) is the next test investment.
- **Focus mode** (spotlight one lane, `j`/`k` to advance) was scoped as a stretch and left out.
- **No virtualization.** Unneeded at the seed's scale (32 issues / 40 PRs); a real workspace with thousands of issues would want row virtualization on the board.

## AI tool usage

- **Tool:** Claude Code (Opus 4.8) as the primary pair, driven step-by-step against the pre-written build plan (`.context/attachments/…`), one milestone per branch/PR.
- **How I directed it:** each step was scoped from the plan's build-order table with explicit guardrails — the repo `CLAUDE.md` conventions (directory-per-component, `Util.ts` + tests, `@/` imports, CSS-variable tokens, required-boolean props), "pure logic in `lib/`, MobX only at the state boundary", and "never cut review-pairing correctness or blocked/overdue visibility". I had it write the pure functions and their tests *before* any UI (steps 0–1) so the hard parts (review pairing, UTC day math, attention derivation) were locked down and unit-tested first.
- **Where I pushed back / changed by hand:** the review-pairing state machine (removed → re-requested with a pre-dating submission stays *pending*; changes-requested stays blocking until approve/dismiss) needed correcting against the seeded edge cases (#501–#507). I kept the store computeds to one-line delegations to tested `lib/` functions rather than letting logic leak into the stores, and moved constants/pure helpers out of components into `Util.ts` files where the first draft inlined them.
- **How I verified:** `pnpm test` (318 pure-function tests over the seeded edge cases — orphans, stacked PRs, bot/outside reviewers, mooted requests, overdue/blocked derivation, UTC day indices, lane packing), `pnpm typecheck`, `pnpm lint`, `next build`, plus Storybook as the visual matrix for the bar/chip/lane states (every bucket, blocked, overdue, clipped) and manual `pnpm dev` against the specific seeded edge cases the plan calls out.
