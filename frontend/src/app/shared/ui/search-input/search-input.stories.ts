import type { Meta, StoryObj } from '@storybook/angular';
import { SearchInput, type SearchInputAppearance, type SearchInputSize, type SearchInputVariant } from './search-input';

type SearchInputStoryArgs = {
  label: string;
  placeholder: string;
  hint: string;
  value: string;
  name: string;
  size: SearchInputSize;
  variant: SearchInputVariant;
  appearance: SearchInputAppearance;
  disabled: boolean;
  clearable: boolean;
  clearAriaLabel: string;
};

const meta: Meta<SearchInputStoryArgs> = {
  title: 'Shared UI/Search Input',
  component: SearchInput,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: 'select',
      options: ['primary', 'neutral', 'violet'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
  },
  args: {
    label: 'Buscar',
    placeholder: 'Buscar proyectos',
    hint: '',
    value: '',
    name: 'search',
    size: 'md',
    variant: 'primary',
    appearance: 'default',
    disabled: false,
    clearable: true,
    clearAriaLabel: 'Limpiar busqueda',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm">
        <app-search-input
          [label]="label"
          [placeholder]="placeholder"
          [hint]="hint"
          [value]="value"
          [name]="name"
          [size]="size"
          [variant]="variant"
          [appearance]="appearance"
          [disabled]="disabled"
          [clearable]="clearable"
          [clearAriaLabel]="clearAriaLabel"
          (valueChange)="value = $event"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<SearchInputStoryArgs>;

export const Default: Story = {};

export const WithValue: Story = {
  args: {
    value: 'Angular',
  },
};

export const Violet: Story = {
  args: {
    variant: 'violet',
    placeholder: 'Buscar automatizaciones',
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
    placeholder: 'Buscar en segundo plano',
  },
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-4">
        <app-search-input label="Pequeno" placeholder="Buscar" size="sm" />
        <app-search-input label="Mediano" placeholder="Buscar" size="md" />
        <app-search-input label="Grande" placeholder="Buscar" size="lg" />
      </div>
    `,
  }),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'Sin permisos',
  },
};
