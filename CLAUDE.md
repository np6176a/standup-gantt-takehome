# Project Rules

## File Organization

Each component MUST have its own directory with these files:

```
{ComponentName}/
  ├── {ComponentName}.tsx        # Component implementation
  ├── {ComponentName}.test.tsx   # Tests
  └── {ComponentName}Util.ts     # Utility functions (constants + pure functions)
```

## Component File Structure

### 1. Component File (`{ComponentName}.tsx`)

```tsx
// 1. Imports (external dependencies first, then local — ALWAYS use @/ absolute paths)
import React from 'react';
import Image from 'next/image'; // Only if using images
import { Icon, getMaterialIcon } from '@/components/icons'; // If using icons

// 2. Props Interface (ALWAYS named {ComponentName}Props)
export interface ComponentNameProps {
  /** Description of prop - always include JSDoc comments */
  propName?: type;
  /** Optional className for styling overrides */
  className?: string;
  /** Additional props spread */
  [key: string]: any; // Only if component needs to accept arbitrary props
}

// 3. Component Export (ALWAYS named export)
/** Brief description of component - always include JSDoc */
export const ComponentName = ({
  propName = defaultValue, // Always provide defaults for optional props
  className = '',
  ...props
}: ComponentNameProps) => {
  // Component implementation
  return (
    <div className={`base-classes ${className}`} {...props}>
      {/* Component JSX */}
    </div>
  );
};
```

**Required Patterns:**

- ✅ ALWAYS export interface as `{ComponentName}Props`
- ✅ ALWAYS include JSDoc comments for all props
- ✅ ALWAYS include `className?: string` prop
- ✅ ALWAYS spread `...props` on root element
- ✅ ALWAYS provide default values for optional props
- ✅ ALWAYS use named exports (not default exports)
- ✅ Use CSS variables from design tokens: `var(--color-primary)`, `var(--font-sans)`, etc.
- ✅ Font sizes MUST use rem units (base 16px): `text-[1rem]`, `text-[1.125rem]`, etc.
- ✅ Use Tailwind CSS classes with design system variables
- ✅ Use Next.js `Image` component for images (not `<img>`)
- ✅ ALWAYS use `@/` absolute import paths (e.g., `@/components/atoms/Button/Button`) — NEVER use relative `../` paths
- ✅ ALWAYS move constants and pure functions into a `{ComponentName}Util.ts` or `{pageName}Util.ts` file — NEVER define them inline in the component/page file. Add unit tests for all pure functions in a corresponding `.test.ts` file.
- ✅ NEVER use array index as React key — use the `uuid` package or create unique identifiers instead

### 2. Stories File (`{ComponentName}.stories.tsx`)

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test'; // Only if component has event handlers

import { ComponentName } from './ComponentName';

const meta = {
  title: '{Category}/{ComponentName}', // e.g., 'Components/Button', 'Molecules/MainNav'
  component: ComponentName,
  parameters: {
    layout: 'centered', // or 'padded', 'fullscreen' based on component
  },
  tags: ['autodocs'],
  args: {
    onClick: fn(), // Include for components with event handlers
  },
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Default props
  },
};

export const VariantName: Story = {
  args: {
    // Variant props
  },
};

// Additional stories...
```

## Design System Standards

### Font Sizes

- MUST use rem units with base 16px
- Examples: `text-[1rem]` (16px), `text-[1.125rem]` (18px), `text-[1.25rem]` (20px)
- NEVER use px values directly in font-size classes

### Colors

- Use CSS variables: `text-[var(--color-text-primary)]`
- Available colors defined in `app/globals.css`
- Primary colors: `--color-primary`, `--color-secondary`, `--color-tertiary`
- Text colors: `--color-text-primary`, `--color-text-secondary`
- Neutral colors: `--color-neutral-light`, `--color-neutral-medium`, etc.

### Typography

- Font family: `font-[var(--font-sans)]` (Outfit font)
- Font weights: use variables — `var(--font-weight-regular)` (400), `var(--font-weight-semibold)` (600), `var(--font-weight-bold)` (700)
- 3 font weights are used: 400, 600, 700 — do NOT use 300 or 500
- Letter spacing: use rem or px as appropriate (e.g., `tracking-[0.9px]`)

### Spacing

- Use Tailwind spacing utilities: `gap-5`, `px-32`, `py-3`
- Maintain consistent spacing scale

## Import Path Patterns

ALWAYS use `@/` absolute imports.

```tsx
// ✅ Correct — absolute path with @/ alias
import { Button } from '@/components/atoms/Button/Button';
import { Navigation } from '@/components/molecules/Navigation/Navigation';

// ❌ NEVER use relative paths
import { Button } from '../../atoms/Button/Button';
import { Navigation } from '../../../components/molecules/Navigation/Navigation';
```

### Images

```tsx
import Image from 'next/image';

// In JSX — use public directory paths
<Image
  src="/images/logo.png"
  alt="Description"
  width={120}
  height={32}
  className="h-8 w-auto object-contain"
  priority // For above-the-fold images
/>
```

## TypeScript Requirements

- ✅ Use proper TypeScript types for all props
- ✅ Use `React.ReactNode` for children
- ✅ Use union types for variants: `'primary' | 'secondary'`
- ✅ Use `satisfies` for Storybook meta (not `as`)
- ✅ Export interfaces for reusability
- ✅ Use optional chaining for optional props: `onClick?.()`
- ✅ Only use optional (`?`) props when absolutely necessary — prefer required props with explicit defaults
- ✅ Boolean props MUST never be optional — always define them as required with a `true` or `false` default value (e.g., `disabled: boolean`, not `disabled?: boolean`)

## Common Patterns

### Conditional Classes

```tsx
className={`
  base-classes
  ${condition ? 'conditional-classes' : 'alternative-classes'}
  ${className}
`}
```

### Event Handlers

```tsx
onClick={(e) => {
  e.preventDefault();
  onClick?.();
}}
```

### Default Props

```tsx
export const Component = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  className = '',
  ...props
}: ComponentProps) => {
  // Implementation
};
```

## Lint Rules

- ESLint uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` (flat config in `eslint.config.mjs`)
- `@next/next/no-img-element`: Always use Next.js `Image` component instead of `<img>`. For animated GIFs, use `Image` with the `unoptimized` prop to preserve animation
- Do NOT disable lint rules. If a rule must be disabled, provide a clear comment explaining why
- Do NOT add unnecessary comments to JSX (e.g., layout descriptions, image dimension notes). The code should be self-documenting
- Run `npm run lint` before committing to catch issues

## Checklist for New Components

Before creating a component, verify:

- [ ] Component file: `{ComponentName}.tsx`
- [ ] Stories file: `{ComponentName}.stories.tsx`
- [ ] Interface named: `{ComponentName}Props`
- [ ] All props have JSDoc comments
- [ ] Includes `className?: string`
- [ ] Spreads `...props`
- [ ] Uses rem units for font sizes
- [ ] Uses CSS variables for colors
- [ ] Storybook title format: `{Category}/{ComponentName}`
- [ ] Multiple stories created
- [ ] Images use Next.js `Image` component
- [ ] All imports use `@/` absolute paths (no relative `../` paths)
- [ ] Constants and pure functions are in a separate `Util.ts` file with unit tests
- [ ] React list keys use unique IDs (not array index)
