import React from 'react';

import { v4 as uuid } from 'uuid';

import { ChevronDownIcon } from '@/components/icons';
import { SelectOption, getSelectClasses } from '@/components/atoms/Select/SelectUtil';

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  /** The currently selected value. */
  value: string;
  /** Called with the new value when the selection changes. */
  onChange: (value: string) => void;
  /** The options to choose from, in display order. */
  options: readonly SelectOption[];
  /** Whether the whole control is disabled. */
  disabled?: boolean;
  /** Accessible label when no visible <label> is associated. */
  'aria-label'?: string;
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * A styled wrapper over the native `<select>`: keeps native keyboard/focus behaviour and
 * on-device option pickers (important for the mobile bottom-sheet forms) while matching the
 * design tokens, with a chevron affordance overlaid. Emits the raw string value so callers
 * map it themselves.
 */
export const Select = ({
  value,
  onChange,
  options,
  disabled = false,
  className = '',
  ...props
}: SelectProps) => (
  <div className="relative">
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={getSelectClasses(`pr-8 ${className}`)}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value || uuid()} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-content-muted"
    >
      <ChevronDownIcon size={16} />
    </span>
  </div>
);
