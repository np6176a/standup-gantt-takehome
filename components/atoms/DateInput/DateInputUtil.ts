/** Base classes for the native date input — design-token colors, rem text, focus ring. */
export const DATE_INPUT_BASE_CLASSES =
  'w-full rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-[0.8125rem] text-content transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60';

/** Compose the date input's classes, appending caller overrides last so they win. */
export function getDateInputClasses(className: string): string {
  return `${DATE_INPUT_BASE_CLASSES} ${className}`.trim();
}

/**
 * Normalize a native date input's string value to the app's date convention: a non-empty
 * "YYYY-MM-DD" string, or null when the field is cleared. Trimmed so a blank value never
 * slips through as an empty string a write would misread.
 */
export function normalizeDateValue(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}
