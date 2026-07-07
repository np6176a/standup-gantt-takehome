import React from 'react';

import type { PullRequest } from '@/lib/normalize/pullRequests';
import type { ReviewDotState } from '@/components/molecules/PrChip/PrChipUtil';
import { PrIcon, XmarkIcon, ClockIcon, CheckIcon, MinusIcon } from '@/components/icons';
import {
  REVIEW_DOT,
  prChipLabel,
  prChipTooltip,
  reviewDotState,
} from '@/components/molecules/PrChip/PrChipUtil';

const REVIEW_ICON: Record<ReviewDotState, React.ReactNode> = {
  changes: <XmarkIcon size={10} />,
  pending: <ClockIcon size={10} />,
  approved: <CheckIcon size={10} />,
  none: <MinusIcon size={10} />,
};

const REVIEW_LABEL: Record<ReviewDotState, string> = {
  changes: 'changes requested',
  pending: 'review pending',
  approved: 'approved',
  none: '',
};

export interface PrChipProps {
  /** The PR this chip represents. */
  pr: PullRequest;
  /** Whether the chip is a stacked child (rendered with an indent connector affordance). */
  stacked: boolean;
  /** Whether to show the author name (true when the author differs from the issue assignee). */
  showAuthor: boolean;
  /** Compact mode (quarter zoom): show only PR icon + number + review icon, no labels. */
  compact: boolean;
  /** Opens the PR (wired in a later milestone). */
  onSelect?: (pr: PullRequest) => void;
  /** Optional className for styling overrides. */
  className?: string;
}

export const PrChip = ({
  pr,
  stacked,
  showAuthor,
  compact,
  onSelect,
  className = '',
}: PrChipProps) => {
  const state = reviewDotState(pr);
  const dot = REVIEW_DOT[state];
  const tooltip = prChipTooltip(pr);
  const reviewLabel = REVIEW_LABEL[state];

  return (
    <button
      type="button"
      title={tooltip}
      aria-label={tooltip}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(pr);
      }}
      className={`inline-flex items-center gap-1 truncate leading-tight text-content-secondary hover:text-content ${stacked ? 'pl-2' : ''} ${className}`}
    >
      <PrIcon size={10} className="shrink-0 opacity-60" />
      <span className="truncate">{prChipLabel(pr)}</span>
      {!compact && showAuthor && pr.authorLogin && (
        <span className="truncate text-[0.5625rem] text-content-muted">
          by {pr.authorLogin}
        </span>
      )}
      <span aria-hidden className={`flex shrink-0 items-center ${dot.className}`}>
        {REVIEW_ICON[state]}
      </span>
      {!compact && reviewLabel.length > 0 && (
        <span className={`truncate text-[0.5625rem] font-[var(--font-weight-semibold)] ${dot.className}`}>
          {reviewLabel}
        </span>
      )}
    </button>
  );
};
