import type { Meta, StoryObj } from '@storybook/angular';
import { Skeleton, type SkeletonAnimation, type SkeletonAppearance, type SkeletonShape, type SkeletonTone } from './skeleton';

type SkeletonStoryArgs = {
  shape: SkeletonShape;
  animation: SkeletonAnimation;
  appearance: SkeletonAppearance;
  tone: SkeletonTone;
  width: string;
  height: string;
  ariaLabel: string;
  decorative: boolean;
};

const meta: Meta<SkeletonStoryArgs> = {
  title: 'Shared UI/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  argTypes: {
    shape: {
      control: 'select',
      options: ['text', 'block', 'circle', 'avatar', 'rounded'],
    },
    animation: {
      control: 'inline-radio',
      options: ['pulse', 'wave', 'none'],
    },
    tone: {
      control: 'inline-radio',
      options: ['default', 'subtle', 'strong'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
  },
  args: {
    shape: 'block',
    animation: 'pulse',
    appearance: 'default',
    tone: 'default',
    width: '',
    height: '',
    ariaLabel: 'Cargando contenido',
    decorative: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm">
        <app-skeleton
          [shape]="shape"
          [animation]="animation"
          [appearance]="appearance"
          [tone]="tone"
          [width]="width"
          [height]="height"
          [ariaLabel]="ariaLabel"
          [decorative]="decorative"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<SkeletonStoryArgs>;

export const Default: Story = {};

export const Text: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-3">
        <app-skeleton shape="text" width="80%" />
        <app-skeleton shape="text" />
        <app-skeleton shape="text" width="64%" />
      </div>
    `,
  }),
};

export const Wave: Story = {
  args: {
    animation: 'wave',
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
  },
};

export const AvatarRow: Story = {
  render: () => ({
    template: `
      <div class="flex max-w-sm items-center gap-3">
        <app-skeleton shape="avatar" decorative />
        <div class="grid flex-1 gap-2">
          <app-skeleton shape="text" width="45%" decorative />
          <app-skeleton shape="text" width="75%" decorative />
        </div>
      </div>
    `,
  }),
};

export const Card: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-4">
        <app-skeleton shape="block" height="10rem" decorative />
        <div class="grid gap-2">
          <app-skeleton shape="text" width="55%" decorative />
          <app-skeleton shape="text" decorative />
          <app-skeleton shape="text" width="72%" decorative />
        </div>
      </div>
    `,
  }),
};

export const List: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-4">
        @for (item of [1, 2, 3]; track item) {
          <div class="flex items-center gap-3">
            <app-skeleton shape="avatar" width="2rem" height="2rem" decorative />
            <div class="grid flex-1 gap-2">
              <app-skeleton shape="text" width="50%" decorative />
              <app-skeleton shape="text" width="82%" decorative />
            </div>
          </div>
        }
      </div>
    `,
  }),
};
