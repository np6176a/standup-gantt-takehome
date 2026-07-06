import React from 'react';

import { ButtonVariant, ButtonSize, getButtonClasses } from '@/components/atoms/Button/ButtonUtil';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style of the button. */
  variant: ButtonVariant;
  /** Size preset. */
  size: ButtonSize;
  /** Content rendered inside the button. */
  children: React.ReactNode;
  /** Optional className for styling overrides. */
  className?: string;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  type = 'button',
  children,
  className = '',
  ...props
}: ButtonProps) => (
  <button
    type={type}
    className={getButtonClasses(variant, size, className)}
    {...props}
  >
    {children}
  </button>
);
