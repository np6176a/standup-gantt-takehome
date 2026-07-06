import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StoreProvider } from '@/stores/StoreProvider';
import { ThemeSwitcher } from '@/components/molecules/ThemeSwitcher/ThemeSwitcher';

const meta = {
  title: 'Molecules/ThemeSwitcher',
  component: ThemeSwitcher,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <StoreProvider>
        <Story />
      </StoreProvider>
    ),
  ],
} satisfies Meta<typeof ThemeSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Toggling theme/accent updates the whole document, so the effect is visible live. */
export const Default: Story = {};
