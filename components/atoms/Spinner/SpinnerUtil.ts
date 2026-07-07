// Pure helpers for the Spinner atom: the pixel diameter and ring thickness per size.

/** The sizes a spinner can take. */
export type SpinnerSize = 'sm' | 'md' | 'lg';

/** Pixel diameter for each spinner size. */
export const SPINNER_SIZE_PX: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 36,
};

/** Ring thickness (border width, px) for each spinner size — thicker as it grows. */
export const SPINNER_BORDER_PX: Record<SpinnerSize, number> = {
  sm: 2,
  md: 3,
  lg: 4,
};

/** The diameter + ring thickness (px) for a spinner size, as inline-style values. */
export function spinnerDimensions(size: SpinnerSize): { diameter: number; borderWidth: number } {
  return { diameter: SPINNER_SIZE_PX[size], borderWidth: SPINNER_BORDER_PX[size] };
}
