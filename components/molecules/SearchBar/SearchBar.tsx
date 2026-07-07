import React from 'react';

import { SearchIcon, CloseIcon } from '@/components/icons';
import { SEARCH_PLACEHOLDER, showClearButton } from '@/components/molecules/SearchBar/SearchBarUtil';

export interface SearchBarProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  /** The current query text (controlled). */
  value: string;
  /** Called with the new query on every keystroke, and with "" when cleared. */
  onChange: (value: string) => void;
  /** Placeholder prompt. */
  placeholder?: string;
  /** Optional className for styling overrides on the wrapper. */
  className?: string;
}

/**
 * The board search field: a magnifier-prefixed text input (with an inline ✕ to clear) that
 * filters the board to issues matching an id, title, or resolved PR number. Controlled — the
 * parent owns the query string and re-filters on each change.
 */
export const SearchBar = ({
  value,
  onChange,
  placeholder = SEARCH_PLACEHOLDER,
  className = '',
  ...props
}: SearchBarProps) => (
  <div className={`relative flex items-center ${className}`}>
    <span
      aria-hidden
      className="pointer-events-none absolute left-2.5 flex items-center text-content-muted"
    >
      <SearchIcon size={16} />
    </span>
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-8 w-full rounded-md border border-border bg-surface-raised pl-8 pr-8 text-[0.8125rem] text-content placeholder:text-content-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-search-cancel-button]:appearance-none"
      {...props}
    />
    {showClearButton(value) && (
      <button
        type="button"
        aria-label="Clear search"
        onClick={() => onChange('')}
        className="absolute right-1.5 flex items-center rounded p-0.5 text-content-muted transition-colors hover:bg-neutral-light hover:text-content"
      >
        <CloseIcon size={14} />
      </button>
    )}
  </div>
);
