'use client';

import React, { useContext, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { StoreContext } from '@/stores/StoreProvider';
import { MoonIcon, PaletteIcon, SunIcon } from '@/components/icons';
import {
  ACCENT_OPTIONS,
  themeLabel,
  themeToggleAriaLabel,
} from '@/components/molecules/ThemeSwitcher/ThemeSwitcherUtil';

export interface ThemeSwitcherProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * Compact control to toggle light/dark theme and switch the primary accent color.
 * Reads and mutates the UI store directly; renders nothing without a StoreProvider.
 */
export const ThemeSwitcher = observer(
  ({ className = '', ...props }: ThemeSwitcherProps) => {
    const store = useContext(StoreContext);

    // Theme/accent come from localStorage, so they differ between the server
    // render (defaults) and the client. Render the controls only after mount to
    // keep hydration consistent; the outer container has no preference-dependent
    // content and is safe to render on the server.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!store) return null;

    const { ui } = store;
    const ThemeIcon = ui.theme === 'dark' ? MoonIcon : SunIcon;

    return (
      <div
        className={`inline-flex min-h-[2.5rem] items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-[0.875rem] text-content ${className}`}
        {...props}
      >
        {mounted ? (
          <>
            <button
              type="button"
              onClick={() => ui.toggleTheme()}
              aria-label={themeToggleAriaLabel(ui.theme)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-raised px-3 py-1 font-[var(--font-weight-semibold)] text-content transition-colors hover:bg-neutral-light"
            >
              <ThemeIcon size={16} aria-hidden />
              {themeLabel(ui.theme)}
            </button>

            <div
              role="group"
              aria-label="Primary color"
              className="flex items-center gap-1.5"
            >
              <PaletteIcon
                size={16}
                aria-hidden
                className="text-content-secondary"
              />
              {ACCENT_OPTIONS.map((option) => {
                const selected = ui.accent === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => ui.setAccent(option.value)}
                    aria-label={option.label}
                    aria-pressed={selected}
                    title={option.label}
                    style={{ backgroundColor: option.swatch }}
                    className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${
                      selected
                        ? 'ring-2 ring-content ring-offset-2 ring-offset-surface'
                        : ''
                    }`}
                  />
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    );
  },
);
