// Pure helpers for the Avatar atom: initials + a stable per-name color.

/** Pixel diameter for each avatar size. */
export const AVATAR_SIZE_PX: Record<'sm' | 'md' | 'lg', number> = {
  sm: 24,
  md: 32,
  lg: 40,
};

/**
 * Up to two initials for a display name: first letters of the first and last words,
 * upper-cased. Falls back to "?" for an empty/whitespace name so a chip never renders blank.
 */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/**
 * A stable hue (0–359) derived from a name, so each teammate keeps the same avatar
 * color across renders and groupings. A tiny deterministic string hash — not
 * cryptographic, just well-spread — keeps it a pure function of the name.
 */
export function avatarHue(name: string): number {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 360;
  }
  return Math.abs(hash);
}

/** Inline background/foreground colors for a name's avatar (graphical, not text). */
export function avatarColors(name: string): { background: string; color: string } {
  const hue = avatarHue(name);
  return {
    background: `hsl(${hue} 55% 45%)`,
    color: '#ffffff',
  };
}
