import React from 'react';

import type { Grouping } from '@/stores/uiStore';
import { GROUPING_OPTIONS } from '@/components/molecules/GroupingToggle/GroupingToggleUtil';

export interface GroupingToggleProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** The active grouping (controlled). */
  grouping: Grouping;
  /** Called with the newly selected grouping. */
  onChange: (grouping: Grouping) => void;
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * Segmented control switching swimlanes between People (standup) and Projects
 * (Linear-screenshot). Controlled — the parent owns the value and re-renders on change.
 */
export const GroupingToggle = ({
  grouping,
  onChange,
  className = '',
  ...props
}: GroupingToggleProps) => {
  return (
    <div
      role="group"
      aria-label="Group swimlanes by"
      className={`inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5 ${className}`}
      {...props}
    >
      {GROUPING_OPTIONS.map((option) => {
        const selected = grouping === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`grow rounded-md px-3 py-1 text-[0.875rem] font-[var(--font-weight-semibold)] transition-colors sm:grow-0 ${
              selected
                ? 'bg-primary text-primary-foreground'
                : 'text-content-secondary hover:bg-neutral-light'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
