import { ACCENTS } from '@/stores/uiStore';
import {
  ACCENT_OPTIONS,
  otherTheme,
  themeLabel,
  themeToggleAriaLabel,
} from '@/components/molecules/ThemeSwitcher/ThemeSwitcherUtil';

describe('otherTheme', () => {
  it('flips light to dark and back', () => {
    expect(otherTheme('light')).toBe('dark');
    expect(otherTheme('dark')).toBe('light');
  });
});

describe('themeLabel', () => {
  it('labels the active theme', () => {
    expect(themeLabel('light')).toContain('Light');
    expect(themeLabel('dark')).toContain('Dark');
  });
});

describe('themeToggleAriaLabel', () => {
  it('names the resulting theme', () => {
    expect(themeToggleAriaLabel('light')).toBe('Switch to dark theme');
    expect(themeToggleAriaLabel('dark')).toBe('Switch to light theme');
  });
});

describe('ACCENT_OPTIONS', () => {
  it('covers every accent exactly once, matching the store', () => {
    const optionValues = ACCENT_OPTIONS.map((option) => option.value);
    expect([...optionValues].sort()).toEqual([...ACCENTS].sort());
  });

  it('gives each option a label and a hex swatch', () => {
    ACCENT_OPTIONS.forEach((option) => {
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.swatch).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});
