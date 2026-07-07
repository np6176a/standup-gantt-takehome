import React from 'react';

import type { Person } from '@/lib/domain/types';
import type { LaneSummary } from '@/lib/gantt/rows';
import type { BadgeTone } from '@/components/molecules/LaneHeader/LaneHeaderUtil';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import {
  BlockedIcon,
  OverdueIcon,
  ClockIcon,
  PrIcon,
} from '@/components/icons';
import { WaveformLines } from '@tailgrids/icons';
import {
  BADGE_TONE_CLASS,
  BADGE_DOT_CLASS,
  attentionDots,
  laneBadges,
  laneCountLabel,
} from '@/components/molecules/LaneHeader/LaneHeaderUtil';

const BADGE_ICON: Record<BadgeTone, React.ReactNode> = {
  blocked: <BlockedIcon size={12} />,
  overdue: <OverdueIcon size={12} />,
  active: <WaveformLines size={12} />,
  review: <PrIcon size={12} />,
  reviews: <ClockIcon size={12} />,
};

export interface LaneHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lane title (person displayName, project name, or a synthetic label). */
  title: string;
  /** The lane's person in person-grouping (renders an avatar); null in project mode. */
  person: Person | null;
  /** Number of issues in the lane, for the summary line. */
  issueCount: number;
  /** Attention badge-cluster counts (blocked/overdue/active/in-review/reviews-waiting). */
  summary: LaneSummary;
  /** Opens the "Needs review" panel for this lane's person (fired by the 👁 badge). */
  onReviewsClick?: () => void;
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * The sticky left-rail header for one swimlane: an avatar (person mode) beside the lane
 * title, an issue-count summary, and the attention badge cluster. The badges lead with
 * blocked/overdue so standup can be run from the rail alone; the reviews badge is a button
 * that opens the "Needs review" panel filtered to this person.
 *
 * Responsive: on `sm+` the rail is wide enough for the avatar + title + full badge
 * cluster. Below `sm` the rail collapses to an avatar-only strip, so the title/cluster
 * hide and the loud attention signals (blocked/overdue/reviews) render as stacked dots
 * beneath the avatar instead.
 */
export const LaneHeader = ({
  title,
  person,
  issueCount,
  summary,
  onReviewsClick,
  className = '',
  ...props
}: LaneHeaderProps) => {
  const badges = laneBadges(summary);
  const dots = attentionDots(summary);

  return (
    <div
      className={`flex h-full flex-col items-center justify-center gap-1 px-1 py-2 sm:flex-row sm:justify-start sm:gap-2.5 sm:px-3 ${className}`}
      {...props}
    >
      {person ? (
        <Avatar name={person.name} size="md" />
      ) : (
        <span
          aria-hidden
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-light text-content-muted"
        >
          #
        </span>
      )}

      {dots.length > 0 && (
        <span
          className="flex items-center gap-1 sm:hidden"
          aria-label={dots.map((dot) => dot.label).join(', ')}
        >
          {dots.map((dot) => (
            <span
              key={dot.key}
              aria-hidden
              title={dot.label}
              className={`h-1.5 w-1.5 rounded-full ${BADGE_DOT_CLASS[dot.tone]}`}
            />
          ))}
        </span>
      )}

      <span className="hidden min-w-0 grow sm:block">
        <span className="block truncate text-[0.9375rem] font-[var(--font-weight-semibold)] capitalize text-content">
          {title}
        </span>
        {badges.length > 0 ? (
          <span className="mt-0.5 flex items-center gap-1">
            {badges.map((badge) => {
              const content = (
                <>
                  <span aria-hidden className="flex items-center">{BADGE_ICON[badge.tone]}</span>
                  {badge.count}
                </>
              );
              const chipClass = `inline-flex items-center gap-0.5 rounded px-1 py-px text-[0.6875rem] font-[var(--font-weight-semibold)] ${BADGE_TONE_CLASS[badge.tone]}`;
              return badge.interactive && onReviewsClick ? (
                <button
                  key={badge.key}
                  type="button"
                  title={`${badge.label} — open review panel`}
                  aria-label={`${badge.label}, open review panel`}
                  onClick={onReviewsClick}
                  className={`${chipClass} transition-opacity hover:opacity-80`}
                >
                  {content}
                </button>
              ) : (
                <span key={badge.key} className={chipClass} title={badge.label} aria-label={badge.label}>
                  {content}
                </span>
              );
            })}
          </span>
        ) : (
          <span className="block truncate text-[0.75rem] text-content-muted">
            {laneCountLabel(issueCount)}
          </span>
        )}
      </span>
    </div>
  );
};
