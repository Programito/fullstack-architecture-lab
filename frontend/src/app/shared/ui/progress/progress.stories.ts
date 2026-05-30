import type { Meta, StoryObj } from '@storybook/angular';
import { Progress, type ProgressAppearance, type ProgressSize, type ProgressVariant } from './progress';

type ProgressStoryArgs = {
  value: number;
  max: number;
  label: string;
  showValue: boolean;
  indeterminate: boolean;
  variant: ProgressVariant;
  size: ProgressSize;
  appearance: ProgressAppearance;
};

const meta: Meta<ProgressStoryArgs> = {
  title: 'Shared UI/Progress',
  component: Progress,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'neutral', 'danger', 'violet'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
  },
  args: {
    value: 64,
    max: 100,
    label: 'Carga',
    showValue: true,
    indeterminate: false,
    variant: 'primary',
    size: 'md',
    appearance: 'default',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-md">
        <app-progress
          [value]="value"
          [max]="max"
          [label]="label"
          [showValue]="showValue"
          [indeterminate]="indeterminate"
          [variant]="variant"
          [size]="size"
          [appearance]="appearance"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ProgressStoryArgs>;

export const Default: Story = {};
export const WithLabel: Story = { args: { label: 'Sincronizacion', showValue: false } };
export const Indeterminate: Story = { args: { indeterminate: true, label: 'Procesando', showValue: false } };
export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-md gap-4">
        <app-progress size="sm" label="Pequeno" [value]="32" showValue />
        <app-progress label="Mediano" [value]="64" showValue />
        <app-progress size="lg" label="Grande" [value]="86" showValue />
      </div>
    `,
  }),
};
export const Variants: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-md gap-4">
        <app-progress variant="primary" label="Primary" [value]="70" showValue />
        <app-progress variant="secondary" label="Secondary" [value]="70" showValue />
        <app-progress variant="neutral" label="Neutral" [value]="70" showValue />
        <app-progress variant="danger" label="Danger" [value]="70" showValue />
        <app-progress variant="violet" label="Violet" [value]="70" showValue />
      </div>
    `,
  }),
};
