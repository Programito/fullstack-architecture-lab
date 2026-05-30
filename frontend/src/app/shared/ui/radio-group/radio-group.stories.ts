import type { Meta, StoryObj } from '@storybook/angular';
import {
  RadioGroup,
  type RadioGroupAppearance,
  type RadioGroupLayout,
  type RadioGroupOption,
  type RadioGroupSize,
  type RadioGroupVariant,
} from './radio-group';

type RadioGroupStoryArgs = {
  label: string;
  hint: string;
  error: string;
  name: string;
  value: string;
  options: RadioGroupOption[];
  variant: RadioGroupVariant;
  appearance: RadioGroupAppearance;
  size: RadioGroupSize;
  layout: RadioGroupLayout;
  disabled: boolean;
  required: boolean;
};

const options: RadioGroupOption[] = [
  {
    label: 'Email',
    value: 'email',
    description: 'Recibe novedades y actividad importante en tu bandeja.',
  },
  {
    label: 'Push',
    value: 'push',
    description: 'Muestra alertas inmediatas en el dispositivo activo.',
  },
  {
    label: 'Digest',
    value: 'digest',
    description: 'Agrupa los cambios relevantes en un resumen diario.',
  },
];

const meta: Meta<RadioGroupStoryArgs> = {
  title: 'Shared UI/Radio Group',
  component: RadioGroup,
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
    layout: {
      control: 'inline-radio',
      options: ['vertical', 'horizontal'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
    options: {
      control: 'object',
    },
  },
  args: {
    label: 'Canal preferido',
    hint: 'Puedes cambiar esta preferencia mas tarde.',
    error: '',
    name: 'notification-channel',
    value: 'email',
    options,
    variant: 'primary',
    appearance: 'default',
    size: 'md',
    layout: 'vertical',
    disabled: false,
    required: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-2xl">
        <app-radio-group
          [label]="label"
          [hint]="hint"
          [error]="error"
          [name]="name"
          [value]="value"
          [options]="options"
          [variant]="variant"
          [appearance]="appearance"
          [size]="size"
          [layout]="layout"
          [disabled]="disabled"
          [required]="required"
          (valueChange)="value = $event"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<RadioGroupStoryArgs>;

export const Default: Story = {};

export const Selected: Story = {
  args: {
    value: 'digest',
    variant: 'violet',
  },
};

export const Horizontal: Story = {
  args: {
    layout: 'horizontal',
    value: 'push',
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
    value: 'push',
  },
};

export const Sizes: Story = {
  render: () => ({
    props: { options },
    template: `
      <div class="grid max-w-2xl gap-5">
        <app-radio-group label="Pequeno" size="sm" value="email" [options]="options" />
        <app-radio-group label="Mediano" size="md" value="push" [options]="options" />
        <app-radio-group label="Grande" size="lg" value="digest" [options]="options" />
      </div>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    props: { options },
    template: `
      <div class="grid max-w-2xl gap-5">
        <app-radio-group label="Primary" variant="primary" value="email" [options]="options" />
        <app-radio-group label="Secondary" variant="secondary" value="email" [options]="options" />
        <app-radio-group label="Neutral" variant="neutral" value="email" [options]="options" />
        <app-radio-group label="Danger" variant="danger" value="email" [options]="options" />
        <app-radio-group label="Violet" variant="violet" value="email" [options]="options" />
      </div>
    `,
  }),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'push',
  },
};

export const Error: Story = {
  args: {
    hint: '',
    error: 'Selecciona un canal para continuar.',
    value: '',
    required: true,
  },
};

export const OptionDisabled: Story = {
  args: {
    value: 'email',
    options: [
      ...options.slice(0, 2),
      {
        ...options[2],
        disabled: true,
        description: 'No disponible en tu plan actual.',
      },
    ],
  },
};
