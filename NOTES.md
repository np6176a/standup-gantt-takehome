# Notes

A Gantt-style standup board over fake Linear issues + GitHub PRs.

## Decisions

**Where this comes from.** At my last job we ran a distributed team, so standup was written async and posted in Slack, and I'd meet with individuals when something needed unblocking. That shaped what I wanted this board to surface at a glance:

- the state of each issue and of its PRs,
- who owns a PR and who they're waiting on for a review or re-review, and how long they've been waiting,
- whether we're overdue on a deadline,
- and whether someone has orphaned PRs pulling their attention away.

I hadn't run a team off a Gantt view beforem I've mostly used Kanban, so I spent time in Linear's Project timeline view to ground my assumptions about what a viewer expects, then layered on what I'd personally want in a standup. That gap is worth naming: I'm partly guessing at what a Gantt-first user expects.

**What I built (and why).**

- **Grouped by person, one row per issue, PRs linked under their issue** (matched by `ORB-###` id). This is the "who owns what, and what's blocking them" view I actually wanted.
- **A "Needs review" focus list.** Getting re-reviews was the recurring blocker on my team, we'd start the day clearing PR reviews to unblock each other, so a longest-waiting-first review panel felt like the highest-leverage thing to add.
- **2-week (sprint) and quarter zooms** on top of Linear's zoom set, since a sprint is usually two weeks.
- **The timeline starts 3 days before today** so there's a sense of lead-in and recent history rather than everything hugging the left edge.

**How I modeled the data.** I gave Claude the raw shapes and had it lay out mapping options, then picked against my mental model:

- **Statuses → 6 color buckets** from the 12 raw states, tracking automation-owned (locked) vs writable states.
- **Reviews (the hardest part):** per reviewer → pending / completed / mooted. Replay the request/remove history (latest wins), drop bots and outside contributors, and keep "changes requested" blocking until an approve or dismiss, a later comment doesn't clear it.
- **PR → issue:** match `ORB-###` in the branch, then the title; a keyless stacked PR inherits its parent's issue; an unknown key becomes a visible **orphan**, never dropped. (Claude surfaced the orphan case when I described the linking — I'd have missed it.)
- **Timeline spans:** start (planned ?? actual) → end (due ?? today-if-started), as half-open UTC day ranges so same-day and in-progress bars still cover their day; a due-only issue renders as a card.
- **Blocked / overdue** are derived (Linear has neither), keyed off the *PR* rather than the automation-owned "In Review" state, which lags reality.

**App-owned state.** Linear only gives me the automation-stamped `startedAt` and a writable `dueDate`, there's no planned-start field, and start-date writes are rejected. So **planned start and manual "blocked" live client-side** (`planningStore` + localStorage); the ghost-vs-solid gap on a bar *is* the plan-vs-reality answer. **Lane placement is derived**, not stored, group by person/project and pack into the fewest non-overlapping rows. The roster and API wire shapes are app-owned modules; app code never imports the fake source.

**App-owned state.**  Linear won’t let me write startedAt — I only get a writable dueDate — so I let users set a plannedStart that lives in local state and localStorage only. The idea: if Linear later adds a start date, the user can see the difference between their plannedStart and the actual start, and since the storage is already in place, building that view is an easy next step. I also added a manual “blocked” toggle for when something comes up mid-standup, it merges with the blocked signal the PRs already imply rather than replacing it. Lane placement is derived, not stored, group by person or project and pack into the fewest non-overlapping rows. The roster and API wire shapes are app-owned modules too; app code never imports the fake source.

**Stack choice.** MobX for local state, localStorage for persistence. I skipped React Query and a GraphQL cache deliberately, this is fetching fake data, so caching the network would be optimizing the wrong thing. The real work is re-deriving views from local state, which MobX does well (memoized normalization, one-line computeds off raw observables).

## Tradeoffs / what I'd do next

- **No horizontal scroll to future dates** — you move the window through the Today/zoom nav rather than dragging the board. Fine for standup, but I'd add it.
- **Directory organization is atomic (atoms/molecules/organisms)** because this is a standalone app and that was simplest. If I were productizing this with more features I'd organize by product mental model instead, an engineer looking for, say, the chat feature would find all of its organism-level components in one feature directory. Atoms and molecules stay shared; organisms get duplicated to keep business logic separated.
- **The default states and filters are my assumptions** about how someone runs standup. In the real world I'd want customer feedback, ideally observed data on how people run standup *today*, before the tool, which could easily disprove some of these choices.
- **Tests cover pure logic, not the DOM.** Jest hits the `lib/` functions and Storybook is the visual layer; the interactive flows (mutation forms, filter toggles) would want jsdom + Testing Library next.
- Left as stretch: focus mode (spotlight a lane, `j`/`k` to advance) and row virtualization, unneeded at the seed's scale, but a real workspace with thousands of issues would need it.

## AI tool usage

I used **Conductor** to orchestrate, running **Claude** and **Codex**. Codex was mostly for PR reviews and catching bugs; Claude did the building.

**How I directed Claude.** Before writing anything I set clear rules in `CLAUDE.md`, Storybook requirements, styling specs, Jest unit tests, and functional paradigms, which kept the output clear and easy to review as I read each feature. I'd start with a rough idea and use planning mode to work out specifics, and I explicitly asked it to find flaws in my logic. For example: *"I want the timeline grouped by user, each row an issue, with PRs linked to the issue by the issue's id number."* Claude came back with the orphan-PR case and the details of the id-linking, which sharpened the model before I wrote a line of code.

**Where I pushed back / did it by hand.** Most of the pushback happened in the planning stage, the user flow, color contrast for accessibility, and UI. On the code side, I fixed how reviews get matched to each reviewer in the edge cases for example, if someone is re-asked to review, they should stay pending even if they’d already reviewed an earlier version. I also kept the stores thin: they just hand raw data to tested helper functions in `lib/` instead of holding the logic themselves.

**How I verified.** After each build I spun up the dev server and walked the user flow myself, including the mobile layout. Conductor's git worktrees let me work features in parallel, so I hooked up the browser MCP and let Claude verify smaller views while I broke down the next feature. On top of the manual passes: the full Jest suite over the seeded edge cases (orphans, stacked PRs, bot/outside reviewers, overdue/blocked derivation, UTC day math, lane packing), plus typecheck, lint, and a clean `next build`.
