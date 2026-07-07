import React from 'react';

import { SpinnerSize, spinnerDimensions } from '@/components/atoms/Spinner/SpinnerUtil';

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Ring diameter. */
  size?: SpinnerSize;
  /** Accessible label announced to screen readers while work is in flight. */
  label?: string;
  /** Optional className for styling overrides. */
  className?: string;
}

/**
 * An indeterminate loading spinner: a spinning ring whose color follows the current text
 * color (`currentColor`), so it inherits its surroundings. Exposes `role="status"` with a
 * visually-hidden label so assistive tech announces the loading state.
 */
export const Spinner = ({ size = 'md', label = 'Loading', className = '', ...props }: SpinnerProps) => {
  const { diameter, borderWidth } = spinnerDimensions(size);

  return (
    <span role="status" className={`inline-flex items-center ${className}`} {...props}>
      <span
        aria-hidden
        style={{ width: diameter, height: diameter, borderWidth }}
        className="inline-block animate-spin rounded-full border-current border-t-transparent"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
};
