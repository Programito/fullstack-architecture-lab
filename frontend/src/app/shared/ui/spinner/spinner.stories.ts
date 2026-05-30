import type { Meta, StoryObj } from '@storybook/angular';
import {
  Spinner,
  type SpinnerAppearance,
  type SpinnerSize,
  type SpinnerTextPosition,
  type SpinnerType,
  type SpinnerVariant,
} from './spinner';

type SpinnerStoryArgs = {
  size: SpinnerSize;
  type: SpinnerType;
  variant: SpinnerVariant;
  appearance: SpinnerAppearance;
  label: string;
  text: string;
  textPosition: SpinnerTextPosition;
  decorative: boolean;
};

const meta: Meta<SpinnerStoryArgs> = {
  title: 'Shared UI/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    type: {
      control: 'inline-radio',
      options: ['ring', 'dual-ring', 'dots', 'bars', 'pulse'],
    },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'neutral', 'danger', 'violet'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
    textPosition: {
      control: 'inline-radio',
      options: ['left', 'right'],
    },
  },
  args: {
    size: 'md',
    type: 'ring',
    variant: 'primary',
    appearance: 'default',
    label: 'Cargando',
    text: '',
    textPosition: 'right',
    decorative: false,
  },
};

export default meta;

type Story = StoryObj<SpinnerStoryArgs>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-4">
        <app-spinner size="sm" label="Cargando pequeno" />
        <app-spinner size="md" label="Cargando medio" />
        <app-spinner size="lg" label="Cargando grande" />
      </div>
    `,
  }),
};

export const Types: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-5">
        @for (type of ['ring', 'dual-ring', 'dots', 'bars', 'pulse']; track type) {
          <app-spinner [type]="type" [label]="'Cargando ' + type" />
        }
      </div>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-4">
        @for (variant of ['primary', 'secondary', 'neutral', 'danger', 'violet']; track variant) {
          <app-spinner [variant]="variant" [label]="'Cargando ' + variant" />
        }
      </div>
    `,
  }),
};

export const WithText: Story = {
  args: {
    text: 'Cargando datos',
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
    type: 'dots',
    text: 'Cargando datos',
    variant: 'neutral',
  },
};

export const TextLeft: Story = {
  args: {
    type: 'dots',
    text: 'Sincronizando',
    textPosition: 'left',
    variant: 'violet',
  },
};

export const Decorative: Story = {
  args: {
    decorative: true,
  },
};
