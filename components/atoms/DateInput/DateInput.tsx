import React from 'react';

import { XmarkIcon } from '@/components/icons';
import { getDateInputClasses, normalizeDateValue } from '@/components/atoms/DateInput/DateInputUtil';

export interface DateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  /** The current date as "YYYY-MM-DD", or null when unset. */
  value: string | null;
  /** Called with the new date ("YYYY-MM-DD") or null when the field is cleared. */
  onChange: (value: string | null) => void;
  /** Whether a "clear" affordance is shown when a value is present. */
  clearable?: boolean;
  /** Whether the input is disabled. */
  disabled?: boolean;
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * A styled native date picker over `<input type="date">`. Emits the app's date shape — a
 * "YYYY-MM-DD" string or null — so callers never juggle empty strings. When `clearable`
 * and a value is set, an inline ✕ clears it (a due date is clearable; a planned start too).
 */
export const DateInput = ({
  value,
  onChange,
  clearable = true,
  disabled = false,
  className = '',
  ...props
}: DateInputProps) => (
  <div className="relative flex items-center">
    <input
      type="date"
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => onChange(normalizeDateValue(event.target.value))}
      className={getDateInputClasses(`${clearable && value ? 'pr-8' : ''} ${className}`)}
      {...props}
    />
    {clearable && value && !disabled && (
      <button
        type="button"
        aria-label="Clear date"
        onClick={() => onChange(null)}
        className="absolute right-2 flex items-center rounded p-0.5 text-content-muted transition-colors hover:bg-neutral-light hover:text-content"
      >
        <XmarkIcon size={14} />
      </button>
    )}
  </div>
);
