import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { Button } from './Button';

const meta = {
  title: 'Atoms/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Click me',
  },
};

export const PrimarySmall: Story = {
  args: {
    variant: 'primary',
    size: 'sm',
    children: 'Small',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    size: 'md',
    children: 'Ghost',
  },
};

export const GhostSmall: Story = {
  args: {
    variant: 'ghost',
    size: 'sm',
    children: 'Ghost small',
  },
};

export const Outlined: Story = {
  args: {
    variant: 'outlined',
    size: 'sm',
    children: 'Today',
  },
};

export const OutlinedMedium: Story = {
  args: {
    variant: 'outlined',
    size: 'md',
    children: 'Outlined',
  },
};

export const OutlinedIcon: Story = {
  args: {
    variant: 'outlined',
    size: 'icon',
    children: '←',
    'aria-label': 'Previous',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Disabled',
    disabled: true,
  },
};
