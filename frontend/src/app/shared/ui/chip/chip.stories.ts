import type { Meta, StoryObj } from '@storybook/angular';
import { Chip, type ChipAppearance, type ChipSize, type ChipVariant } from './chip';

type ChipStoryArgs = {
  label: string;
  variant: ChipVariant;
  appearance: ChipAppearance;
  size: ChipSize;
  selected: boolean;
  disabled: boolean;
  removable: boolean;
};

const meta: Meta<ChipStoryArgs> = {
  title: 'Shared UI/Chip',
  component: Chip,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'neutral', 'success', 'warning', 'danger', 'violet'],
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
  },
  args: {
    label: 'Frontend',
    variant: 'neutral',
    appearance: 'default',
    size: 'md',
    selected: false,
    disabled: false,
    removable: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <app-chip
        [variant]="variant"
        [appearance]="appearance"
        [size]="size"
        [selected]="selected"
        [disabled]="disabled"
        [removable]="removable"
      >
        {{ label }}
      </app-chip>
    `,
  }),
};

export default meta;

type Story = StoryObj<ChipStoryArgs>;

export const Default: Story = {};

export const Selected: Story = {
  args: {
    selected: true,
    variant: 'violet',
  },
};

export const Removable: Story = {
  args: {
    label: 'Angular',
    removable: true,
    variant: 'primary',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
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
        <app-chip variant="primary">Primary</app-chip>
        <app-chip variant="neutral">Neutral</app-chip>
        <app-chip variant="success">Success</app-chip>
        <app-chip variant="warning">Warning</app-chip>
        <app-chip variant="danger">Danger</app-chip>
        <app-chip variant="violet">Violet</app-chip>
      </div>
    `,
  }),
};

export const SelectedVariants: Story = {
  render: () => ({
    template: `
      <div class="flex flex-wrap gap-2">
        <app-chip selected variant="primary">Primary</app-chip>
        <app-chip selected variant="neutral">Neutral</app-chip>
        <app-chip selected variant="success">Success</app-chip>
        <app-chip selected variant="warning">Warning</app-chip>
        <app-chip selected variant="danger">Danger</app-chip>
        <app-chip selected variant="violet">Violet</app-chip>
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="flex flex-wrap items-center gap-2">
        <app-chip size="sm">Pequeno</app-chip>
        <app-chip size="md">Mediano</app-chip>
      </div>
    `,
  }),
};
