import type { Meta, StoryObj } from '@storybook/angular';
import {
  Select,
  type SelectAppearance,
  type SelectFill,
  type SelectMode,
  type SelectOption,
  type SelectSize,
  type SelectVariant,
} from './select';

type SelectStoryArgs = {
  label: string;
  placeholder: string;
  hint: string;
  error: string;
  value: string;
  dialogTitle: string;
  name: string;
  options: SelectOption[];
  variant: SelectVariant;
  fill: SelectFill;
  appearance: SelectAppearance;
  mode: SelectMode;
  size: SelectSize;
  disabled: boolean;
  required: boolean;
};

const options: SelectOption[] = [
  { label: 'Producto', value: 'product' },
  { label: 'Soporte', value: 'support' },
  { label: 'Facturacion', value: 'billing' },
  { label: 'Archivado', value: 'archived', disabled: true },
];

const meta: Meta<SelectStoryArgs> = {
  title: 'Shared UI/Select',
  component: Select,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'neutral', 'danger', 'violet'],
    },
    fill: {
      control: 'inline-radio',
      options: ['default', 'solid', 'outline'],
    },
    mode: {
      control: 'inline-radio',
      options: ['native', 'dialog'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
  },
  args: {
    label: 'Categoria',
    placeholder: 'Selecciona una categoria',
    hint: 'Usaremos esta categoria para organizar el registro.',
    error: '',
    value: '',
    dialogTitle: 'Selecciona una categoria',
    name: 'category',
    options,
    variant: 'primary',
    fill: 'default',
    appearance: 'default',
    mode: 'native',
    size: 'md',
    disabled: false,
    required: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm">
        <app-select
          [label]="label"
          [placeholder]="placeholder"
          [hint]="hint"
          [error]="error"
          [value]="value"
          [dialogTitle]="dialogTitle"
          [name]="name"
          [options]="options"
          [variant]="variant"
          [fill]="fill"
          [appearance]="appearance"
          [mode]="mode"
          [size]="size"
          [disabled]="disabled"
          [required]="required"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<SelectStoryArgs>;

export const Default: Story = {};

export const Solid: Story = {
  args: {
    fill: 'solid',
    value: 'support',
  },
};

export const Outline: Story = {
  args: {
    fill: 'outline',
    variant: 'violet',
    value: 'billing',
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
    value: 'product',
  },
};

export const OutlineLongText: Story = {
  args: {
    fill: 'outline',
    variant: 'violet',
    value: 'enterprise',
    options: [
      { label: 'Plan Enterprise con soporte prioritario', value: 'enterprise' },
      { label: 'Plan Profesional', value: 'professional' },
      { label: 'Plan Basico', value: 'basic' },
    ],
  },
};

export const Dialog: Story = {
  args: {
    mode: 'dialog',
    fill: 'outline',
    variant: 'violet',
    dialogTitle: 'Selecciona el tipo de solicitud',
    placeholder: 'Abrir selector',
    options: [
      { label: 'Producto y nuevas funcionalidades', value: 'product' },
      { label: 'Soporte tecnico y errores de la cuenta', value: 'support' },
      { label: 'Facturacion, suscripciones y pagos', value: 'billing' },
      { label: 'Archivado', value: 'archived', disabled: true },
    ],
  },
};

export const Error: Story = {
  args: {
    hint: '',
    error: 'Selecciona una categoria.',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'product',
  },
};

export const Variants: Story = {
  render: () => ({
    props: { options },
    template: `
      <div class="grid max-w-sm gap-4">
        <app-select variant="primary" fill="outline" label="Primary" value="product" [options]="options" />
        <app-select variant="danger" fill="outline" label="Danger" value="support" [options]="options" />
        <app-select variant="violet" fill="outline" label="Violet" value="billing" [options]="options" />
      </div>
    `,
  }),
};
