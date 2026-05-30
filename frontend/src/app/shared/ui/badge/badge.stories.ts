import type { Meta, StoryObj } from '@storybook/angular';
import { Badge, type BadgeAppearance, type BadgeFill, type BadgeShape, type BadgeSize, type BadgeVariant } from './badge';

type BadgeStoryArgs = {
  label: string;
  variant: BadgeVariant;
  fill: BadgeFill;
  size: BadgeSize;
  shape: BadgeShape;
  appearance: BadgeAppearance;
};

const meta: Meta<BadgeStoryArgs> = {
  title: 'Shared UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'neutral', 'success', 'warning', 'danger', 'violet'],
    },
    fill: {
      control: 'inline-radio',
      options: ['solid', 'outline', 'soft', 'gradient'],
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md'],
    },
    shape: {
      control: 'inline-radio',
      options: ['default', 'round'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
  },
  args: {
    label: 'Activo',
    variant: 'success',
    fill: 'soft',
    size: 'md',
    shape: 'round',
    appearance: 'default',
  },
  render: (args) => ({
    props: args,
    template: `
      <app-badge
        [variant]="variant"
        [fill]="fill"
        [size]="size"
        [shape]="shape"
        [appearance]="appearance"
      >
        {{ label }}
      </app-badge>
    `,
  }),
};

export default meta;

type Story = StoryObj<BadgeStoryArgs>;

export const Default: Story = {};

export const Solid: Story = {
  args: {
    fill: 'solid',
  },
};

export const Outline: Story = {
  args: {
    fill: 'outline',
  },
};

export const Violet: Story = {
  args: {
    label: 'IA',
    variant: 'violet',
  },
};

export const Gradient: Story = {
  args: {
    label: 'Beta',
    fill: 'gradient',
    variant: 'violet',
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
    variant: 'primary',
  },
};

export const Variants: Story = {
  render: () => ({
    template: `
      <div class="flex flex-wrap gap-2">
        <app-badge variant="primary">Primary</app-badge>
        <app-badge variant="secondary">Secondary</app-badge>
        <app-badge variant="neutral">Neutral</app-badge>
        <app-badge variant="success">Success</app-badge>
        <app-badge variant="warning">Warning</app-badge>
        <app-badge variant="danger">Danger</app-badge>
        <app-badge variant="violet">Violet</app-badge>
      </div>
    `,
  }),
};

export const Fills: Story = {
  render: () => ({
    template: `
      <div class="flex flex-wrap gap-2">
        <app-badge fill="solid" variant="violet">Solid</app-badge>
        <app-badge fill="outline" variant="violet">Outline</app-badge>
        <app-badge fill="soft" variant="violet">Soft</app-badge>
        <app-badge fill="gradient" variant="violet">Gradient</app-badge>
      </div>
    `,
  }),
};
