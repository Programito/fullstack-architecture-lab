import type { Meta, StoryObj } from '@storybook/angular';
import { Combobox, type ComboboxAppearance, type ComboboxFill, type ComboboxOption, type ComboboxSize, type ComboboxVariant } from './combobox';

const options: ComboboxOption[] = [
  { label: 'Producto', value: 'product', description: 'Consultas comerciales' },
  { label: 'Soporte', value: 'support', description: 'Ayuda tecnica' },
  { label: 'Facturacion', value: 'billing' },
  { label: 'Archivado', value: 'archived', disabled: true },
];

type ComboboxStoryArgs = {
  label: string;
  placeholder: string;
  hint: string;
  error: string;
  emptyText: string;
  value: string;
  query: string;
  options: ComboboxOption[];
  variant: ComboboxVariant;
  fill: ComboboxFill;
  appearance: ComboboxAppearance;
  size: ComboboxSize;
  clearable: boolean;
  disabled: boolean;
  required: boolean;
};

const meta: Meta<ComboboxStoryArgs> = {
  title: 'Shared UI/Combobox',
  component: Combobox,
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
    label: 'Categoria',
    placeholder: 'Busca una categoria',
    hint: 'Escribe para filtrar opciones.',
    error: '',
    emptyText: 'Sin resultados',
    value: '',
    query: '',
    options,
    variant: 'primary',
    fill: 'default',
    appearance: 'default',
    size: 'md',
    clearable: true,
    disabled: false,
    required: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm">
        <app-combobox
          [label]="label"
          [placeholder]="placeholder"
          [hint]="hint"
          [error]="error"
          [emptyText]="emptyText"
          [(value)]="value"
          [(query)]="query"
          [options]="options"
          [variant]="variant"
          [fill]="fill"
          [appearance]="appearance"
          [size]="size"
          [clearable]="clearable"
          [disabled]="disabled"
          [required]="required"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ComboboxStoryArgs>;

export const Default: Story = {};
export const Selected: Story = { args: { value: 'support' } };
export const Empty: Story = { args: { query: 'zzz' } };
export const Disabled: Story = { args: { disabled: true, value: 'product' } };
export const Error: Story = { args: { hint: '', error: 'Selecciona una categoria.' } };
export const Sizes: Story = {
  render: () => ({
    props: { options },
    template: `
      <div class="grid max-w-sm gap-4">
        <app-combobox label="Pequeno" size="sm" [options]="options" />
        <app-combobox label="Mediano" [options]="options" />
        <app-combobox label="Grande" size="lg" [options]="options" />
      </div>
    `,
  }),
};
export const Variants: Story = {
  render: () => ({
    props: { options },
    template: `
      <div class="grid max-w-sm gap-4">
        <app-combobox label="Primary" variant="primary" fill="outline" [options]="options" />
        <app-combobox label="Secondary" variant="secondary" fill="outline" [options]="options" />
        <app-combobox label="Neutral" variant="neutral" fill="outline" [options]="options" />
        <app-combobox label="Danger" variant="danger" fill="outline" [options]="options" />
        <app-combobox label="Violet" variant="violet" fill="outline" [options]="options" />
      </div>
    `,
  }),
};
