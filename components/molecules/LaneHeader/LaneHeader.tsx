import React from 'react';

import type { Person } from '@/lib/domain/types';
import { Avatar } from '@/components/atoms/Avatar/Avatar';
import { laneCountLabel } from '@/components/molecules/LaneHeader/LaneHeaderUtil';

export interface LaneHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lane title (person displayName, project name, or a synthetic label). */
  title: string;
  /** The lane's person in person-grouping (renders an avatar); null in project mode. */
  person: Person | null;
  /** Number of issues in the lane, for the summary line. */
  issueCount: number;
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * The sticky left-rail header for one swimlane: an avatar (person mode) beside the
 * lane title and an issue-count summary. The attention badge cluster
 * (blocked/overdue/review) is layered in here in a later milestone.
 */
export const LaneHeader = ({
  title,
  person,
  issueCount,
  className = '',
  ...props
}: LaneHeaderProps) => {
  return (
    <div className={`flex h-full items-center gap-2.5 px-3 py-2 ${className}`} {...props}>
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
      <span className="min-w-0">
        <span className="block truncate text-[0.9375rem] font-[var(--font-weight-semibold)] capitalize text-content">
          {title}
        </span>
        <span className="block truncate text-[0.75rem] text-content-muted">
          {laneCountLabel(issueCount)}
        </span>
      </span>
    </div>
  );
};
