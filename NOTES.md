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
- Per-theme values are picked for WCAG AA contrast. The primary fill is the accent-600
  step in both themes (so `text-primary-foreground` contrast is theme-independent); cool
  accents keep a white foreground, warm/light accents (amber/emerald/sky) override to a
  dark foreground + lighter hover. Every `bg-primary` + foreground pair is >= 4.5:1 AA in
  both themes (audited; rose lowest at 4.70). `--color-text-on-primary` is aliased to
  `--color-primary-foreground` so `text-content-on-primary` can't drift from the per-accent
  value. Light `text-muted` is slate-500 (slate-400 fails at 2.56:1). Status/attention
  colors brighten in dark mode and have light + dark values; they are bucket FILL colors
  (bars/badges/dots), not AA as small text on the light surface — noted in globals.css.
- `uiStore` owns `theme` + `accent`; `StoreProvider` mirrors them to `<html>` via a MobX
  `reaction` and persists to localStorage. An inline no-flash script in `app/layout.tsx`
  applies the saved theme before first paint. The visible theme/accent switcher UI is a
  later milestone; step 0 lays the token + store foundation.
- Jest `testMatch` widened to also run `components/**/*.test.{ts,tsx}` (CLAUDE.md's
  per-component `{Name}Util.test.ts` / `{Name}.test.tsx` files) so no component test is
  silently skipped. Current tests are pure functions (node env); DOM render tests would
  need a jsdom env, which is out of scope with Storybook serving as the visual layer.

## Tradeoffs / what you'd do next

- Known rough edges or incomplete areas.
- What you would improve with more time.
- Any assumptions you made about the product or data.

## AI tool usage

- Which tools you used.
- How you directed them, where you pushed back, and what you changed by hand.
- How you verified the generated code or designs.
