import type { Meta, StoryObj } from '@storybook/angular';
import { Checkbox, type CheckboxAppearance, type CheckboxSize, type CheckboxVariant } from './checkbox';

type CheckboxStoryArgs = {
  label: string;
  description: string;
  name: string;
  value: string;
  variant: CheckboxVariant;
  appearance: CheckboxAppearance;
  size: CheckboxSize;
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  required: boolean;
};

const meta: Meta<CheckboxStoryArgs> = {
  title: 'Shared UI/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'neutral', 'danger', 'violet'],
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
  },
  args: {
    label: 'Aceptar condiciones',
    description: 'Puedes cambiar esta preferencia mas tarde.',
    name: 'terms',
    value: 'accepted',
    variant: 'primary',
    appearance: 'default',
    size: 'md',
    checked: false,
    indeterminate: false,
    disabled: false,
    required: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <app-checkbox
        [label]="label"
        [description]="description"
        [name]="name"
        [value]="value"
        [variant]="variant"
        [appearance]="appearance"
        [size]="size"
        [checked]="checked"
        [indeterminate]="indeterminate"
        [disabled]="disabled"
        [required]="required"
      />
    `,
  }),
};

export default meta;

type Story = StoryObj<CheckboxStoryArgs>;

export const Default: Story = {};

export const Checked: Story = {
  args: {
    checked: true,
  },
};

export const Indeterminate: Story = {
  args: {
    indeterminate: true,
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    checked: true,
  },
};

export const Variants: Story = {
  render: () => ({
    template: `
      <div class="grid gap-4">
        <app-checkbox checked variant="primary" label="Primary" />
        <app-checkbox checked variant="secondary" label="Secondary" />
        <app-checkbox checked variant="neutral" label="Neutral" />
        <app-checkbox checked variant="danger" label="Danger" />
        <app-checkbox checked variant="violet" label="Violet" />
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="grid gap-4">
        <app-checkbox checked size="sm" label="Pequeno" />
        <app-checkbox checked size="md" label="Mediano" />
        <app-checkbox checked size="lg" label="Grande" />
      </div>
    `,
  }),
};
