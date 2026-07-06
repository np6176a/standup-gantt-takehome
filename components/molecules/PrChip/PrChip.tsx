import React from 'react';

import type { PullRequest } from '@/lib/normalize/pullRequests';
import type { PrChipMode } from '@/lib/gantt/density';
import type { ReviewDotState } from '@/components/molecules/PrChip/PrChipUtil';
import { XmarkIcon, ClockIcon, CheckIcon, MinusIcon } from '@/components/icons';
import {
  REVIEW_DOT,
  prChipAriaLabel,
  prChipLabel,
  reviewDotState,
} from '@/components/molecules/PrChip/PrChipUtil';

const REVIEW_ICON: Record<ReviewDotState, React.ReactNode> = {
  changes: <XmarkIcon size={10} />,
  pending: <ClockIcon size={10} />,
  approved: <CheckIcon size={10} />,
  none: <MinusIcon size={10} />,
};

export interface PrChipProps {
  /** The PR this chip represents. */
  pr: PullRequest;
  /** Left edge within the window, as a percentage. */
  leftPct: number;
  /** Chip width as a percentage (ignored in `dot` mode). */
  widthPct: number;
  /** Span starts before the window — square off the left edge. */
  clippedLeft: boolean;
  /** Span ends after the window — square off the right edge. */
  clippedRight: boolean;
  /** Render mode: a full thin bar, a collapsed dot, or hidden (handled by the caller). */
  mode: PrChipMode;
  /** Whether the chip is a stacked child (rendered with an indent connector affordance). */
  stacked: boolean;
  /** Opens the PR (wired in a later milestone). */
  onSelect?: (pr: PullRequest) => void;
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * A thin PR chip nested under its resolved issue on the same timeline scale, spanning
 * first-commit → merged/closed/now. It carries a review-state dot (○ pending, ✗ changes
 * requested, ✓ approved) that stays legible even when the bar is too narrow for the "#123"
 * label. At quarter zoom the chip collapses to just the dot; at year it isn't rendered.
 */
export const PrChip = ({
  pr,
  leftPct,
  widthPct,
  clippedLeft,
  clippedRight,
  mode,
  stacked,
  onSelect,
  className = '',
}: PrChipProps) => {
  const state = reviewDotState(pr);
  const dot = REVIEW_DOT[state];
  const ariaLabel = prChipAriaLabel(pr);

  if (mode === 'dot') {
    return (
      <button
        type="button"
        title={ariaLabel}
        aria-label={ariaLabel}
        onClick={() => onSelect?.(pr)}
        className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 leading-none ${dot.className} ${className}`}
        style={{ left: `${leftPct}%` }}
      >
        <span aria-hidden className="flex items-center">{REVIEW_ICON[state]}</span>
      </button>
    );
  }

  const cornerClass = `${clippedLeft ? 'rounded-l-none' : 'rounded-l'} ${
    clippedRight ? 'rounded-r-none' : 'rounded-r'
  }`;

  return (
    <button
      type="button"
      title={ariaLabel}
      aria-label={ariaLabel}
      onClick={() => onSelect?.(pr)}
      className={`absolute top-1/2 flex h-3 min-w-[0.75rem] -translate-y-1/2 items-center gap-0.5 overflow-hidden border border-border bg-surface-raised px-1 text-[0.625rem] leading-none text-content-secondary ${cornerClass} ${stacked ? 'ml-2 border-dashed' : ''} ${className}`}
      style={{ left: `${leftPct}%`, width: `max(0.75rem, ${widthPct}%)` }}
    >
      <span aria-hidden className={`flex shrink-0 items-center ${dot.className}`}>
        {REVIEW_ICON[state]}
      </span>
      <span className="truncate">{prChipLabel(pr)}</span>
    </button>
  );
};
