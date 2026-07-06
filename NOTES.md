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
React or MobX, just functions that take data and return data, with 143 unit tests.
Building it first (before any UI) is where the tricky date and edge-case bugs get caught.

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
  outside contributors, and treat "changes requested" as still blocking even if the
  reviewer later just leaves a comment. Times are compared as real dates, not text, so
  timestamp formatting can't trip it up.
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
  between them can show plan-vs-reality.
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
  4. A "changes requested" review stays blocking even if the reviewer later just comments.
  5. Review times are compared as real instants, so odd timestamp formats still line up.

## Tradeoffs / what you'd do next

- Known rough edges or incomplete areas.
- What you would improve with more time.
- Any assumptions you made about the product or data.

## AI tool usage

- Which tools you used.
- How you directed them, where you pushed back, and what you changed by hand.
- How you verified the generated code or designs.
