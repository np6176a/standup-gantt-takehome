export type ButtonVariant = 'primary' | 'ghost' | 'outlined';
export type ButtonSize = 'sm' | 'md' | 'icon';

const BASE_CLASSES =
  'inline-flex items-center justify-center rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary-hover',
  ghost:
    'bg-transparent text-content-secondary hover:bg-neutral-light hover:text-content',
  outlined:
    'border border-border bg-surface-raised text-content hover:bg-neutral-light',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-[0.875rem]',
  md: 'px-4 py-2 text-[0.875rem]',
  icon: 'h-8 w-8',
};

export const getButtonClasses = (
  variant: ButtonVariant,
  size: ButtonSize,
  className: string,
): string =>
  `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`.trim();
