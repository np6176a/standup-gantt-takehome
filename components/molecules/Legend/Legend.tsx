import React from 'react';

import { BlockedIcon, OverdueIcon } from '@/components/icons';
import { ATTENTION_KEY, bucketLegend } from '@/components/molecules/Legend/LegendUtil';

const ATTENTION_ICON: Record<string, React.ReactNode> = {
  blocked: <BlockedIcon size={14} />,
  overdue: <OverdueIcon size={14} />,
};

export interface LegendProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * The board legend: the bucket → raw-states mapping (so a bucket color stays traceable to
 * the granular states it stands for — the hybrid's discoverability half) plus the loud
 * attention key. Purely presentational; the mapping is sourced from `lib/domain/states`.
 */
export const Legend = ({ className = '', ...props }: LegendProps) => {
  const buckets = bucketLegend();

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.6875rem] text-content-secondary ${className}`}
      {...props}
    >
      {buckets.map((entry) => (
        <span key={entry.bucket} className="inline-flex items-center gap-1.5" title={entry.states}>
          <span aria-hidden className={`h-3 w-3 shrink-0 rounded-sm ${entry.swatchClass}`} />
          <span className="font-[var(--font-weight-semibold)] text-content">{entry.label}</span>
          <span className="text-content-muted">{entry.states}</span>
        </span>
      ))}

      <span aria-hidden className="h-4 w-px bg-border" />

      {ATTENTION_KEY.map((entry) => (
        <span key={entry.key} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={`flex shrink-0 items-center leading-none ${entry.toneClass}`}>
            {ATTENTION_ICON[entry.key]}
          </span>
          <span className={`font-[var(--font-weight-semibold)] ${entry.toneClass}`}>
            {entry.label}
          </span>
        </span>
      ))}
    </div>
  );
};
