'use client';

import React, { useContext, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { StoreContext } from '@/stores/StoreProvider';
import { Button } from '@/components/atoms/Button/Button';
import { ChevronDownIcon, MoonIcon, PaletteIcon, SunIcon } from '@/components/icons';
import {
  ACCENT_OPTIONS,
  accentOption,
  themeToggleAriaLabel,
} from '@/components/molecules/ThemeSwitcher/ThemeSwitcherUtil';

export interface ThemeSwitcherProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * Small icon-only control to toggle light/dark theme and switch the primary accent color.
 * The theme toggle is a single sun/moon icon button (no text label); the accent swatches
 * are tucked into a dropdown next to it. Reads and mutates the UI store directly; renders
 * nothing without a StoreProvider.
 */
export const ThemeSwitcher = observer(
  function ThemeSwitcher({ className = '', ...props }: ThemeSwitcherProps) {
    const store = useContext(StoreContext);

    // Theme/accent come from localStorage, so they differ between the server
    // render (defaults) and the client. Render the controls only after mount to
    // keep hydration consistent; the outer container has no preference-dependent
    // content and is safe to render on the server.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const [accentOpen, setAccentOpen] = useState(false);
    const accentRef = useRef<HTMLDivElement>(null);

    // Close the accent dropdown on an outside click or Escape while it is open.
    useEffect(() => {
      if (!accentOpen) return;
      const onPointerDown = (event: MouseEvent) => {
        if (!accentRef.current?.contains(event.target as Node)) setAccentOpen(false);
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') setAccentOpen(false);
      };
      document.addEventListener('mousedown', onPointerDown);
      document.addEventListener('keydown', onKeyDown);
      return () => {
        document.removeEventListener('mousedown', onPointerDown);
        document.removeEventListener('keydown', onKeyDown);
      };
    }, [accentOpen]);

    if (!store) return null;

    const { ui } = store;
    const ThemeIcon = ui.theme === 'dark' ? MoonIcon : SunIcon;
    const activeAccent = accentOption(ui.accent);

    return (
      <div
        className={`inline-flex min-h-[1rem] items-center gap-0.5 text-content ${className}`}
        {...props}
      >
        {mounted ? (
          <>
            <Button
              variant="outlined"
              size="icon"
              onClick={() => ui.toggleTheme()}
              aria-label={themeToggleAriaLabel(ui.theme)}
              className="h-4 w-4"
            >
              <ThemeIcon size={11} aria-hidden />
            </Button>

            <div ref={accentRef} className="relative">
              <Button
                variant="outlined"
                size="sm"
                onClick={() => setAccentOpen((open) => !open)}
                aria-label={`Primary color: ${activeAccent.label}`}
                aria-haspopup="menu"
                aria-expanded={accentOpen}
                className="h-5 gap-0.5 px-1 py-0"
              >
                <PaletteIcon size={11} aria-hidden className="text-content-secondary" />
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-full ring-1 ring-border"
                  style={{ backgroundColor: activeAccent.swatch }}
                />
                <ChevronDownIcon
                  size={10}
                  aria-hidden
                  className={`text-content-secondary transition-transform ${
                    accentOpen ? 'rotate-180' : ''
                  }`}
                />
              </Button>

              {accentOpen ? (
                <div
                  role="menu"
                  aria-label="Primary color"
                  className="absolute left-0 top-full z-40 mt-1 flex items-center gap-1.5 rounded-lg border border-border bg-surface p-2 shadow-lg"
                >
                  {ACCENT_OPTIONS.map((option) => {
                    const selected = ui.accent === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="menuitemradio"
                        onClick={() => {
                          ui.setAccent(option.value);
                          setAccentOpen(false);
                        }}
                        aria-label={option.label}
                        aria-checked={selected}
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
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    );
  },
);
