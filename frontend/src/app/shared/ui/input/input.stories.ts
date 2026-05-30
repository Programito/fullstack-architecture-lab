import type { Meta, StoryObj } from '@storybook/angular';
import {
  Input,
  type InputAppearance,
  type InputFill,
  type InputLabelPlacement,
  type InputSize,
  type InputType,
  type InputVariant,
} from './input';

type InputStoryArgs = {
  id: string | null;
  label: string;
  placeholder: string;
  hint: string;
  error: string;
  value: string;
  name: string;
  type: InputType;
  autocomplete: string | null;
  minLength: number | null;
  maxLength: number | null;
  min: number | null;
  max: number | null;
  step: number | 'any' | null;
  variant: InputVariant;
  fill: InputFill;
  appearance: InputAppearance;
  labelPlacement: InputLabelPlacement;
  size: InputSize;
  disabled: boolean;
  readonly: boolean;
  required: boolean;
};

const meta: Meta<InputStoryArgs> = {
  title: 'Shared UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['email', 'number', 'password', 'search', 'tel', 'text', 'url'],
    },
    autocomplete: {
      control: 'text',
    },
    minLength: {
      control: 'number',
    },
    maxLength: {
      control: 'number',
    },
    min: {
      control: 'number',
    },
    max: {
      control: 'number',
    },
    step: {
      control: 'text',
    },
    fill: {
      control: 'inline-radio',
      options: ['default', 'solid', 'outline'],
    },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'neutral', 'danger', 'violet'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
    labelPlacement: {
      control: 'inline-radio',
      options: ['default', 'floating'],
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
  },
  args: {
    id: null,
    label: 'Email',
    placeholder: 'nombre@empresa.com',
    hint: 'Usaremos este email para acceder a tu cuenta.',
    error: '',
    value: '',
    name: 'email',
    type: 'email',
    autocomplete: 'email',
    minLength: null,
    maxLength: null,
    min: null,
    max: null,
    step: null,
    variant: 'primary',
    fill: 'default',
    appearance: 'default',
    labelPlacement: 'default',
    size: 'md',
    disabled: false,
    readonly: false,
    required: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm">
        <app-input
          [id]="id"
          [label]="label"
          [placeholder]="placeholder"
          [hint]="hint"
          [error]="error"
          [value]="value"
          [name]="name"
          [type]="type"
          [autocomplete]="autocomplete"
          [minLength]="minLength"
          [maxLength]="maxLength"
          [min]="min"
          [max]="max"
          [step]="step"
          [variant]="variant"
          [fill]="fill"
          [appearance]="appearance"
          [labelPlacement]="labelPlacement"
          [size]="size"
          [disabled]="disabled"
          [readonly]="readonly"
          [required]="required"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<InputStoryArgs>;

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

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
    hint: 'Campo con presencia visual reducida.',
  },
};

export const Error: Story = {
  args: {
    hint: '',
    error: 'Introduce un email valido.',
    value: 'nombre',
  },
};

export const TextLength: Story = {
  args: {
    label: 'Nombre',
    placeholder: 'Entre 3 y 40 caracteres',
    hint: 'Usa entre 3 y 40 caracteres.',
    type: 'text',
    autocomplete: 'name',
    minLength: 3,
    maxLength: 40,
  },
};

export const NumberRange: Story = {
  args: {
    label: 'Cantidad',
    placeholder: '0',
    hint: 'El valor debe estar entre 1 y 10.',
    name: 'quantity',
    type: 'number',
    min: 1,
    max: 10,
    step: 1,
  },
};

export const Floating: Story = {
  args: {
    label: 'Nombre',
    placeholder: '',
    hint: 'El label queda integrado visualmente en el campo.',
    labelPlacement: 'floating',
    value: 'Ada Lovelace',
  },
};

export const OutlineFloating: Story = {
  args: {
    label: 'Email',
    placeholder: '',
    hint: 'El label sube al enfocar o cuando el campo tiene valor.',
    fill: 'outline',
    labelPlacement: 'floating',
    value: '',
  },
};

export const SolidFloating: Story = {
  args: {
    label: 'Email',
    placeholder: '',
    hint: 'En solid el label sube sin marcar borde.',
    fill: 'solid',
    labelPlacement: 'floating',
    value: '',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'nombre@empresa.com',
  },
};

export const DisabledStates: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-4">
        <app-input disabled label="Default" value="nombre@empresa.com" />
        <app-input disabled fill="solid" label="Solid" value="nombre@empresa.com" />
        <app-input disabled fill="outline" label="Outline" value="nombre@empresa.com" />
        <app-input disabled labelPlacement="floating" label="Floating" value="nombre@empresa.com" />
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-4">
        <app-input size="sm" label="Pequeno" placeholder="sm" />
        <app-input size="md" label="Mediano" placeholder="md" />
        <app-input size="lg" label="Grande" placeholder="lg" />
      </div>
    `,
  }),
};

export const Fills: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-4">
        <app-input fill="default" label="Default" placeholder="Default" />
        <app-input fill="solid" label="Solid" placeholder="Solid" />
        <app-input fill="outline" label="Outline" placeholder="Outline" />
      </div>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-4">
        <app-input variant="primary" fill="outline" labelPlacement="floating" label="Primary" value="primary@example.com" />
        <app-input variant="secondary" fill="outline" labelPlacement="floating" label="Secondary" value="secondary@example.com" />
        <app-input variant="neutral" fill="outline" labelPlacement="floating" label="Neutral" value="neutral@example.com" />
        <app-input variant="danger" fill="outline" labelPlacement="floating" label="Danger" value="danger@example.com" />
        <app-input variant="violet" fill="outline" labelPlacement="floating" label="Violet" value="violet@example.com" />
      </div>
    `,
  }),
};
