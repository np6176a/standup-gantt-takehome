import type { Config } from 'tailwindcss';

/*
  Colors map to the CSS variables defined in app/globals.css (single source of
  truth). `darkMode: 'class'` means the `.dark` class on <html> flips the theme;
  `[data-accent]` on <html> swaps the primary hue. So `bg-primary`,
  `text-content`, `bg-status-active`, etc. all resolve to the active theme/accent.
*/
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          muted: 'var(--color-primary-muted)',
          foreground: 'var(--color-primary-foreground)',
        },
        secondary: 'var(--color-secondary)',
        tertiary: 'var(--color-tertiary)',
        canvas: 'var(--color-bg)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          raised: 'var(--color-surface-raised)',
        },
        border: 'var(--color-border)',
        content: {
          DEFAULT: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          'on-primary': 'var(--color-text-on-primary)',
        },
        neutral: {
          light: 'var(--color-neutral-light)',
          medium: 'var(--color-neutral-medium)',
          dark: 'var(--color-neutral-dark)',
        },
        status: {
          active: 'var(--color-status-active)',
          'active-muted': 'var(--color-status-active-muted)',
          review: 'var(--color-status-review)',
          'review-muted': 'var(--color-status-review-muted)',
          shipping: 'var(--color-status-shipping)',
          'shipping-muted': 'var(--color-status-shipping-muted)',
          planned: 'var(--color-status-planned)',
          'planned-muted': 'var(--color-status-planned-muted)',
          done: 'var(--color-status-done)',
          'done-muted': 'var(--color-status-done-muted)',
          dropped: 'var(--color-status-dropped)',
          'dropped-muted': 'var(--color-status-dropped-muted)',
        },
        attention: {
          blocked: 'var(--color-attention-blocked)',
          overdue: 'var(--color-attention-overdue)',
        },
      },
      fontFamily: {
        sans: 'var(--font-sans)',
      },
      fontWeight: {
        regular: '400',
        semibold: '600',
        bold: '700',
      },
    },
  },
  plugins: [],
};

export default config;
