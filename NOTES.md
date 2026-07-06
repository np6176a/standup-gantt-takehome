# Notes

A short writeup to submit with your repo. Keep it brief: a page or two is plenty.

## Decisions

- What you chose to build, what you deliberately left out, and why.
- How you modeled issues, pull requests, reviews, statuses, and timeline spans.
- Where you put app-owned state, such as lane placement or planned starts, and how you
  reasoned about it.

### Theming & design tokens (build step 0)

- Colors are Tailwind-palette values expressed as CSS variables in `app/globals.css`,
  wired into `tailwind.config.ts` `theme.extend.colors` as the single source of truth
  (satisfies CLAUDE.md's CSS-variable rule and Tailwind ergonomics — `bg-primary`,
  `text-content`, `bg-status-active`, etc.).
- Three orthogonal switches on `<html>`: `.dark` class (light/dark theme, Tailwind
  `darkMode: 'class'`), `[data-accent]` (swappable primary hue — default indigo, plus
  violet/emerald/rose/amber/sky), and the accent scale drives `--color-primary`.
- Per-theme values are picked for WCAG AA contrast: light uses the 600 accent step on
  white with white foreground; dark brightens accents/statuses (400–500 steps) against
  slate-950. Status buckets and attention (blocked/overdue) each have light + dark values.
- `uiStore` owns `theme` + `accent`; `StoreProvider` mirrors them to `<html>` via a MobX
  `reaction` and persists to localStorage. An inline no-flash script in `app/layout.tsx`
  applies the saved theme before first paint. The visible theme/accent switcher UI is a
  later milestone; step 0 lays the token + store foundation.
- Jest `testMatch` widened to also run `components/**/*.test.ts` (CLAUDE.md's per-component
  `{Name}Util.test.ts` files) — pure functions, node env is fine; DOM render tests are out
  of scope with Storybook serving as the visual layer.

### Domain, normalization & gantt scale (build step 1)

All of this is pure, framework-free, and unit-tested under `lib/` (135 tests) before
any UI — the highest value-per-hour work and the part most likely to hide off-by-one
and edge-case bugs.

- **Boundary — app-owned roster & wire contract.** App code never imports the Fake
  source's `TEAM` (it impersonates an external system). `lib/domain/roster.ts` holds a
  hand-transcribed email→githubLogin map (with a test that guards it against drift from
  `TEAM`), and `lib/domain/wire.ts` declares the external GraphQL shapes we normalize
  FROM as app-owned types (a structural subset of the Fake payloads). Tests import the
  seed only as realistic *fixtures*.
- **Status model.** `lib/domain/states.ts` maps the 12 raw states → 6 buckets and is the
  seam that absorbs unknown/custom state names (`bucketForState` falls back to
  `planned`, never throws). It also owns `AUTOMATION_OWNED_STATES` (5, shown locked in
  the editor), `WRITABLE_STATES` (7), and the bucket sort order. The raw state name is
  always retained on the normalized `Issue`.
- **Reviews (the subtlest).** `pairReviews` produces one outcome per roster reviewer:
  it replays REQUESTED/REMOVED timeline events (last wins) and pairs the open request
  against submissions. A submission at/after the open request → `completed` (the seed
  stamps request and review at the same instant, so the pairing uses `>=`; only a
  submission that clearly *pre-dates* a re-request stays `pending`). Open request with
  no answer → `mooted` if the PR is closed/merged, else `pending`; a submission with no
  open request → drive-by `completed`. Bots/outsiders are filtered up front.
- **PR→issue resolution.** Branch name first, then title (`\bORB-\d+\b`), validated
  against the live identifier set — a stale/typo key resolves to a surfaced orphan, not
  a silent drop. Stacked PRs are detected per-repo via `baseRefName` → parent head
  branch; a keyless child inherits the parent's issue.
- **Attention (app-owned).** Linear has no "Blocked" state and no overdue flag, so both
  are derived: `isOverdue` (past due and not Done/Canceled) and `derivedBlocked`
  (open-PR CHANGES_REQUESTED, or a stale >2-day pending review on an In Review issue).
  The manual "mark blocked" flag lives in `planningStore` and merges with this at the
  store level (later milestone).
- **Spans & the UTC rule.** `computeSpan` gives `start = plannedStart ?? startedAt`,
  `end = dueDate ?? (start ? today : null)`; both null → unscheduled shelf. The planned
  vs actual start edges are both returned so the gap can render as the plan-vs-reality
  drift. `lib/gantt/scale.ts` anchors *everything* on UTC day indices (whole UTC days
  since epoch) so a date-only `dueDate` and a full-ISO `startedAt` on the same calendar
  day collapse to the same integer — the #1 Gantt off-by-one is designed out.
- **Layout.** `packLanes` is greedy first-fit *in caller order* (not re-sorted), so the
  caller's priority ordering (blocked/overdue first) is preserved as it packs rows.

## Tradeoffs / what you'd do next

- Known rough edges or incomplete areas.
- What you would improve with more time.
- Any assumptions you made about the product or data.

## AI tool usage

- Which tools you used.
- How you directed them, where you pushed back, and what you changed by hand.
- How you verified the generated code or designs.
