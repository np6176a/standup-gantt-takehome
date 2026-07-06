import type { Zoom } from '@/lib/gantt/scale';

/** A zoom level with its short toolbar label. */
export interface ZoomOption {
  value: Zoom;
  label: string;
}

/** The four zoom levels, in coarsening order. Month is the default (seed density). */
export const ZOOM_OPTIONS: readonly ZoomOption[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
] as const;

/** True for a string that is a valid {@link Zoom} (for `<select>` change events). */
export function isZoom(value: string): value is Zoom {
  return ZOOM_OPTIONS.some((option) => option.value === value);
}
