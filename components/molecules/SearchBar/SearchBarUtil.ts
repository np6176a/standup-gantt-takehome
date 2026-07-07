// Pure helpers for the SearchBar: its placeholder copy and whether a clear affordance shows.

/** Placeholder prompt for the board search field. */
export const SEARCH_PLACEHOLDER = 'Search issue id or PR #';

/** Whether the inline clear (✕) button should render — only when the field has content. */
export function showClearButton(value: string): boolean {
  return value.length > 0;
}
