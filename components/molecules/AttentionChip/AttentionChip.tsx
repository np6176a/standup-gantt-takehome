import React from 'react';

import { BlockedIcon, OverdueIcon } from '@/components/icons';
import { attentionChipModel } from '@/components/molecules/AttentionChip/AttentionChipUtil';

export interface AttentionChipProps
  extends Omit<React.HTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** Board-wide count of blocked issues (⛔). */
  blocked: number;
  /** Board-wide count of overdue issues (⚠). */
  overdue: number;
  /** Whether the attention-only board filter is currently on. */
  active: boolean;
  /** Toggle the attention-only filter. */
  onToggle: () => void;
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * Toolbar attention summary: blocked + overdue counts as one chip that, when clicked,
 * filters the board down to only those issues (the standup "show me just the fires"
 * toggle). Reads as loud when there are attention items, calm ("All clear") when none.
 * Controlled — the parent owns the counts and the active state.
 */
export const AttentionChip = ({
  blocked,
  overdue,
  active,
  onToggle,
  className = '',
  ...props
}: AttentionChipProps) => {
  const model = attentionChipModel(blocked, overdue);

  return (
    <button
      type="button"
      onClick={onToggle}
      title="Filter by"
      aria-pressed={active}
      aria-label={`${model.label}${active ? ' (filtering board)' : ''}`}
      className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[0.8125rem] font-[var(--font-weight-semibold)] transition-colors ${
        active
          ? 'border-primary bg-primary-muted text-content'
          : 'border-border bg-surface-raised text-content-secondary hover:bg-neutral-light'
      } ${className}`}
      {...props}
    >
      {model.hasAttention ? (
        <>
          <span className="inline-flex items-center gap-1 text-attention-blocked">
            <span aria-hidden className="flex items-center">
              <BlockedIcon size={15} />
            </span>
            <span className="tabular-nums">{blocked}</span>
          </span>
          <span aria-hidden className="h-3 w-px bg-border" />
          <span className="inline-flex items-center gap-1 text-attention-overdue">
            <span aria-hidden className="flex items-center">
              <OverdueIcon size={15} />
            </span>
            <span className="tabular-nums">{overdue}</span>
          </span>
        </>
      ) : (
        <span className="text-content-secondary">All clear</span>
      )}
    </button>
  );
};
