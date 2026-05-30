import type { Meta, StoryObj } from '@storybook/angular';
import { Avatar, type AvatarAppearance, type AvatarShape, type AvatarSize, type AvatarVariant } from './avatar';

type AvatarStoryArgs = {
  src: string;
  alt: string;
  name: string;
  initials: string;
  size: AvatarSize;
  shape: AvatarShape;
  variant: AvatarVariant;
  appearance: AvatarAppearance;
};

const meta: Meta<AvatarStoryArgs> = {
  title: 'Shared UI/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    shape: {
      control: 'inline-radio',
      options: ['circle', 'square'],
    },
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'violet'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
  },
  args: {
    src: '',
    alt: '',
    name: 'Ada Lovelace',
    initials: '',
    size: 'md',
    shape: 'circle',
    variant: 'neutral',
    appearance: 'default',
  },
};

export default meta;

type Story = StoryObj<AvatarStoryArgs>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-3">
        <app-avatar size="sm" name="Ada Lovelace" />
        <app-avatar size="md" name="Grace Hopper" />
        <app-avatar size="lg" name="Katherine Johnson" />
      </div>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-3">
        <app-avatar name="Ada Lovelace" variant="neutral" />
        <app-avatar name="Grace Hopper" variant="primary" />
        <app-avatar name="Katherine Johnson" variant="violet" />
      </div>
    `,
  }),
};

export const Square: Story = {
  args: {
    shape: 'square',
    variant: 'primary',
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
    variant: 'primary',
  },
};

export const Fallback: Story = {
  args: {
    name: '',
    initials: '',
    variant: 'violet',
  },
};
