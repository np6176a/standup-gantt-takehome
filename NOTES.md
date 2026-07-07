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

## Tradeoffs / what you'd do next

- Known rough edges or incomplete areas.
- What you would improve with more time.
- Any assumptions you made about the product or data.

## AI tool usage

- Which tools you used.
- How you directed them, where you pushed back, and what you changed by hand.
- How you verified the generated code or designs.
