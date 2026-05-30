import type { Meta, StoryObj } from '@storybook/angular';
import { Slider, type SliderAppearance, type SliderOption, type SliderSize, type SliderValue, type SliderVariant } from './slider';

type SliderStoryArgs = {
  id: string | null;
  label: string;
  hint: string;
  error: string;
  name: string;
  options: SliderOption[];
  value: SliderValue;
  variant: SliderVariant;
  appearance: SliderAppearance;
  size: SliderSize;
  disabled: boolean;
  required: boolean;
  showValue: boolean;
  showMarks: boolean;
};

const intensityOptions: SliderOption[] = [
  { label: 'Bajo', value: 'low' },
  { label: 'Medio', value: 'medium' },
  { label: 'Alto', value: 'high' },
];

const numericOptions: SliderOption[] = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5', value: 5 },
];

const meta: Meta<SliderStoryArgs> = {
  title: 'Shared UI/Slider',
  component: Slider,
  tags: ['autodocs'],
  argTypes: {
    options: {
      control: 'object',
    },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'neutral', 'danger', 'violet'],
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
    id: null,
    label: 'Intensidad',
    hint: 'Selecciona una posicion discreta.',
    error: '',
    name: 'intensity',
    options: intensityOptions,
    value: 'medium',
    variant: 'primary',
    appearance: 'default',
    size: 'md',
    disabled: false,
    required: false,
    showValue: true,
    showMarks: true,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-md">
        <app-slider
          [id]="id"
          [label]="label"
          [hint]="hint"
          [error]="error"
          [name]="name"
          [options]="options"
          [value]="value"
          [variant]="variant"
          [appearance]="appearance"
          [size]="size"
          [disabled]="disabled"
          [required]="required"
          [showValue]="showValue"
          [showMarks]="showMarks"
          (valueChange)="value = $event"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<SliderStoryArgs>;

export const Default: Story = {};

export const NumericLabels: Story = {
  args: {
    label: 'Prioridad',
    hint: 'Escala numerica de 1 a 5.',
    name: 'priority',
    options: numericOptions,
    value: 3,
  },
};

export const Sizes: Story = {
  render: () => ({
    props: {
      options: intensityOptions,
    },
    template: `
      <div class="grid max-w-md gap-5">
        <app-slider label="Pequeno" size="sm" value="low" [options]="options" />
        <app-slider label="Mediano" size="md" value="medium" [options]="options" />
        <app-slider label="Grande" size="lg" value="high" [options]="options" />
      </div>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    props: {
      options: intensityOptions,
    },
    template: `
      <div class="grid max-w-md gap-5">
        <app-slider label="Primary" variant="primary" value="medium" [options]="options" />
        <app-slider label="Secondary" variant="secondary" value="medium" [options]="options" />
        <app-slider label="Neutral" variant="neutral" value="medium" [options]="options" />
        <app-slider label="Danger" variant="danger" value="medium" [options]="options" />
        <app-slider label="Violet" variant="violet" value="medium" [options]="options" />
      </div>
    `,
  }),
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
    variant: 'violet',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const Error: Story = {
  args: {
    hint: '',
    error: 'Selecciona una intensidad valida.',
    variant: 'danger',
  },
};

export const WithoutMarks: Story = {
  args: {
    showMarks: false,
    hint: 'Solo se muestra el valor seleccionado.',
  },
};
