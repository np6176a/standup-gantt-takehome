import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { Button } from '@/components/atoms/Button/Button';
import { ModalSheet } from './ModalSheet';

const meta = {
  title: 'Molecules/ModalSheet',
  component: ModalSheet,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    onClose: fn(),
    title: 'New issue',
  },
} satisfies Meta<typeof ModalSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <p className="text-[0.8125rem] text-content-secondary">
        Modal body content goes here. Press Escape or click the backdrop to dismiss.
      </p>
    ),
  },
};

export const WithFooter: Story = {
  args: {
    children: (
      <p className="text-[0.8125rem] text-content-secondary">
        A form would render here, with its actions pinned to the footer below.
      </p>
    ),
    footer: (
      <>
        <Button variant="ghost" size="sm">
          Cancel
        </Button>
        <Button variant="primary" size="sm">
          Create
        </Button>
      </>
    ),
  },
};

export const Small: Story = {
  args: {
    width: 'sm',
    children: <p className="text-[0.8125rem] text-content-secondary">A narrower sheet.</p>,
  },
};
