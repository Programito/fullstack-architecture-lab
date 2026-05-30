import type { Meta, StoryObj } from '@storybook/angular';
import { Switch, type SwitchAppearance, type SwitchSize, type SwitchVariant } from './switch';

type SwitchStoryArgs = {
  label: string;
  description: string;
  name: string;
  value: string;
  variant: SwitchVariant;
  appearance: SwitchAppearance;
  size: SwitchSize;
  checked: boolean;
  disabled: boolean;
  required: boolean;
};

const meta: Meta<SwitchStoryArgs> = {
  title: 'Shared UI/Switch',
  component: Switch,
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
    label: 'Notificaciones',
    description: 'Recibe avisos importantes por email.',
    name: 'notifications',
    value: 'enabled',
    variant: 'primary',
    appearance: 'default',
    size: 'md',
    checked: false,
    disabled: false,
    required: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm">
        <app-switch
          [label]="label"
          [description]="description"
          [name]="name"
          [value]="value"
          [variant]="variant"
          [appearance]="appearance"
          [size]="size"
          [checked]="checked"
          [disabled]="disabled"
          [required]="required"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<SwitchStoryArgs>;

export const Default: Story = {};

export const Checked: Story = {
  args: {
    checked: true,
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
    checked: true,
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
      <div class="grid max-w-sm gap-4">
        <app-switch checked variant="primary" label="Primary" />
        <app-switch checked variant="secondary" label="Secondary" />
        <app-switch checked variant="neutral" label="Neutral" />
        <app-switch checked variant="danger" label="Danger" />
        <app-switch checked variant="violet" label="Violet" />
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-4">
        <app-switch checked size="sm" label="Pequeno" />
        <app-switch checked size="md" label="Mediano" />
        <app-switch checked size="lg" label="Grande" />
      </div>
    `,
  }),
};
