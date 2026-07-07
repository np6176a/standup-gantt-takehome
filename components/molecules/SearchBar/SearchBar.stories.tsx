import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { SearchBar } from '@/components/molecules/SearchBar/SearchBar';

const meta = {
  title: 'Molecules/SearchBar',
  component: SearchBar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    value: '',
    onChange: fn(),
  },
} satisfies Meta<typeof SearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

/** With a query typed, the inline ✕ clear button appears. */
export const WithQuery: Story = { args: { value: 'ORB-104' } };

export const PrNumber: Story = { args: { value: '#528' } };
