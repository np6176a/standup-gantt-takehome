import React from 'react';

import { AVATAR_SIZE_PX, AvatarSize, avatarColors, initials } from '@/components/atoms/Avatar/AvatarUtil';

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Full display name; drives the initials and the stable per-name color. */
  name: string;
  /** Circle diameter. */
  size?: AvatarSize;
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * A circular initials chip identifying a teammate. Color is derived from the name so a
 * person keeps the same swatch everywhere. Decorative: the name is conveyed by adjacent
 * text, so the initials are `aria-hidden` and a `title` carries the full name on hover.
 */
export const Avatar = ({ name, size = 'md', className = '', ...props }: AvatarProps) => {
  const diameter = AVATAR_SIZE_PX[size];
  const { background, color } = avatarColors(name);

  return (
    <span
      title={name}
      style={{ width: diameter, height: diameter, background, color }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-[var(--font-weight-semibold)] leading-none ${size === 'xs' ? 'text-[0.625rem]' : 'text-[0.75rem]'} ${className}`}
      {...props}
    >
      <span aria-hidden>{initials(name)}</span>
    </span>
  );
};
