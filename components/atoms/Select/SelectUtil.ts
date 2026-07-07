/** One option in a {@link Select}. A `disabled` option renders but can't be chosen. */
export interface SelectOption {
  /** The value submitted when this option is chosen. */
  value: string;
  /** The human-readable label shown in the list. */
  label: string;
  /** When true, the option is shown greyed-out and unselectable (e.g. a locked state). */
  disabled?: boolean;
}

/** Base classes for the native select — design-token colors, rem text, focus ring. */
export const SELECT_BASE_CLASSES =
  'w-full appearance-none rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-[0.8125rem] text-content transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60';

/** Compose the select's classes, appending caller overrides last so they win. */
export function getSelectClasses(className: string): string {
  return `${SELECT_BASE_CLASSES} ${className}`.trim();
}
