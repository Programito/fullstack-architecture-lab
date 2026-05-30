import type { Meta, StoryObj } from '@storybook/angular';
import { MultiSelect, type MultiSelectAppearance, type MultiSelectOption, type MultiSelectVariant } from './multi-select';

const options: MultiSelectOption[] = [
  { label: 'Angular', value: 'angular', description: 'Frontend' },
  { label: 'Tailwind', value: 'tailwind', description: 'CSS' },
  { label: 'Vitest', value: 'vitest', description: 'Testing' },
  { label: 'Legacy', value: 'legacy', disabled: true },
];

type Args = {
  label: string;
  hint: string;
  error: string;
  value: string[];
  query: string;
  options: MultiSelectOption[];
  maxSelected: number | null;
  variant: MultiSelectVariant;
  appearance: MultiSelectAppearance;
  disabled: boolean;
  required: boolean;
};

const meta: Meta<Args> = {
  title: 'Shared UI/Multi Select',
  component: MultiSelect,
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
    label: 'Tecnologias',
    hint: 'Selecciona una o varias opciones.',
    error: '',
    value: [],
    query: '',
    options,
    maxSelected: null,
    variant: 'primary',
    appearance: 'default',
    disabled: false,
    required: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm">
        <app-multi-select
          [label]="label"
          [hint]="hint"
          [error]="error"
          [(value)]="value"
          [(query)]="query"
          [options]="options"
          [maxSelected]="maxSelected"
          [variant]="variant"
          [appearance]="appearance"
          [disabled]="disabled"
          [required]="required"
        />
      </div>
    `,
  }),
};

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};
export const SelectedValues: Story = { args: { value: ['angular', 'vitest'] } };
export const MaxSelected: Story = { args: { value: ['angular'], maxSelected: 1 } };
export const Disabled: Story = { args: { disabled: true, value: ['angular'] } };
export const Error: Story = { args: { hint: '', error: 'Selecciona al menos una opcion.' } };
export const Empty: Story = { args: { query: 'zzz' } };
export const Sizes: Story = {
  render: () => ({
    props: { options },
    template: `
      <div class="grid max-w-sm gap-4">
        <app-multi-select label="Pequeno" size="sm" [options]="options" />
        <app-multi-select label="Mediano" [options]="options" />
        <app-multi-select label="Grande" size="lg" [options]="options" />
      </div>
    `,
  }),
};
export const Variants: Story = {
  render: () => ({
    props: { options },
    template: `
      <div class="grid max-w-sm gap-4">
        <app-multi-select label="Primary" variant="primary" fill="outline" [options]="options" />
        <app-multi-select label="Secondary" variant="secondary" fill="outline" [options]="options" />
        <app-multi-select label="Neutral" variant="neutral" fill="outline" [options]="options" />
        <app-multi-select label="Danger" variant="danger" fill="outline" [options]="options" />
        <app-multi-select label="Violet" variant="violet" fill="outline" [options]="options" />
      </div>
    `,
  }),
};
