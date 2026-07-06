import { AccentName, ThemeMode } from '@/stores/uiStore';

/** A selectable primary color, with a fixed swatch hex (its Tailwind 500 step). */
export interface AccentOption {
  /** Accent identifier stored on the UI store / applied as [data-accent]. */
  value: AccentName;
  /** Human-readable label. */
  label: string;
  /** Representative color for the swatch dot (independent of the active accent). */
  swatch: string;
}

/**
 * Accent choices shown in the switcher, in display order. Swatch colors are fixed
 * hexes (not the `--accent-*` variables, which all change with the active accent).
 */
export const ACCENT_OPTIONS: readonly AccentOption[] = [
  { value: 'indigo', label: 'Indigo', swatch: '#6366f1' },
  { value: 'violet', label: 'Violet', swatch: '#8b5cf6' },
  { value: 'emerald', label: 'Emerald', swatch: '#10b981' },
  { value: 'rose', label: 'Rose', swatch: '#f43f5e' },
  { value: 'amber', label: 'Amber', swatch: '#f59e0b' },
  { value: 'sky', label: 'Sky', swatch: '#0ea5e9' },
] as const;

/** The theme that a toggle would switch to from the given one. */
export const otherTheme = (theme: ThemeMode): ThemeMode =>
  theme === 'light' ? 'dark' : 'light';

/** Short text label naming the currently active theme (icon is rendered separately). */
export const themeLabel = (theme: ThemeMode): string =>
  theme === 'dark' ? 'Dark' : 'Light';

/** Accessible label for the theme toggle button, naming the resulting theme. */
export const themeToggleAriaLabel = (theme: ThemeMode): string =>
  `Switch to ${otherTheme(theme)} theme`;
