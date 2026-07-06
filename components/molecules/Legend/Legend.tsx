import React from 'react';

import { BlockedIcon, OverdueIcon, ChevronDownIcon } from '@/components/icons';
import { ATTENTION_KEY, bucketLegend } from '@/components/molecules/Legend/LegendUtil';

const ATTENTION_ICON: Record<string, React.ReactNode> = {
  blocked: <BlockedIcon size={12} />,
  overdue: <OverdueIcon size={12} />,
};

export interface LegendProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the legend content is visible (collapsed shows only the toggle). */
  open: boolean;
  /** Fires when the user clicks the collapse/expand toggle. */
  onToggle: () => void;
  /** Optional className for styling overrides. */
  className?: string;
}

export const Legend = ({ open, onToggle, className = '', ...props }: LegendProps) => {
  const buckets = bucketLegend();

  return (
    <div className={`flex items-center gap-1 ${className}`} {...props}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? 'Hide legend' : 'Show legend'}
        className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[0.6875rem] font-[var(--font-weight-semibold)] text-content-muted transition-colors hover:bg-neutral-light hover:text-content"
      >
        <ChevronDownIcon
          size={12}
          className={`transition-transform ${open ? '' : '-rotate-90'}`}
        />
        Legend
      </button>

      {open && (
        <div className="flex items-center gap-x-3 overflow-x-auto text-[0.6875rem] text-content-secondary">
          {buckets.map((entry) => (
            <span key={entry.bucket} className="inline-flex shrink-0 items-center gap-1.5" title={entry.states || entry.label}>
              <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-sm ${entry.swatchClass}`} />
              <span className="font-[var(--font-weight-semibold)] text-content">{entry.label}</span>
              {entry.states && <span className="text-content-muted">{entry.states}</span>}
            </span>
          ))}

          <span aria-hidden className="h-3.5 w-px shrink-0 bg-border" />

          {ATTENTION_KEY.map((entry) => (
            <span key={entry.key} className="inline-flex shrink-0 items-center gap-1">
              <span aria-hidden className={`flex items-center ${entry.toneClass}`}>
                {ATTENTION_ICON[entry.key]}
              </span>
              <span className={`font-[var(--font-weight-semibold)] ${entry.toneClass}`}>
                {entry.name}
              </span>
              <span className="text-content-muted">({entry.detail})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
