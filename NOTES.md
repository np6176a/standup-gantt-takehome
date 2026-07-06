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

## Tradeoffs / what you'd do next

- Known rough edges or incomplete areas.
- What you would improve with more time.
- Any assumptions you made about the product or data.

## AI tool usage

- Which tools you used.
- How you directed them, where you pushed back, and what you changed by hand.
- How you verified the generated code or designs.
