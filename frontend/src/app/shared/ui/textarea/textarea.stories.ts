import type { Meta, StoryObj } from '@storybook/angular';
import {
  Textarea,
  type TextareaAppearance,
  type TextareaFill,
  type TextareaLabelPlacement,
  type TextareaSize,
  type TextareaVariant,
} from './textarea';

type TextareaStoryArgs = {
  label: string;
  placeholder: string;
  hint: string;
  error: string;
  value: string;
  name: string;
  variant: TextareaVariant;
  fill: TextareaFill;
  appearance: TextareaAppearance;
  labelPlacement: TextareaLabelPlacement;
  size: TextareaSize;
  rows: number;
  disabled: boolean;
  readonly: boolean;
  required: boolean;
  resize: boolean;
};

const meta: Meta<TextareaStoryArgs> = {
  title: 'Shared UI/Textarea',
  component: Textarea,
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
    labelPlacement: {
      control: 'inline-radio',
      options: ['default', 'floating'],
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
    label: 'Descripcion',
    placeholder: 'Escribe una descripcion breve',
    hint: 'Maximo 240 caracteres.',
    error: '',
    value: '',
    name: 'description',
    variant: 'primary',
    fill: 'default',
    appearance: 'default',
    labelPlacement: 'default',
    size: 'md',
    rows: 4,
    disabled: false,
    readonly: false,
    required: false,
    resize: true,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm">
        <app-textarea
          [label]="label"
          [placeholder]="placeholder"
          [hint]="hint"
          [error]="error"
          [value]="value"
          [name]="name"
          [variant]="variant"
          [fill]="fill"
          [appearance]="appearance"
          [labelPlacement]="labelPlacement"
          [size]="size"
          [rows]="rows"
          [disabled]="disabled"
          [readonly]="readonly"
          [required]="required"
          [resize]="resize"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<TextareaStoryArgs>;

export const Default: Story = {};

export const SolidFloating: Story = {
  args: {
    fill: 'solid',
    labelPlacement: 'floating',
    placeholder: '',
  },
};

export const OutlineFloating: Story = {
  args: {
    fill: 'outline',
    labelPlacement: 'floating',
    placeholder: '',
    variant: 'violet',
  },
};

export const Error: Story = {
  args: {
    hint: '',
    error: 'La descripcion es obligatoria.',
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
    hint: 'Textarea con presencia visual reducida.',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'Contenido no editable',
  },
};

export const Variants: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-4">
        <app-textarea variant="primary" fill="outline" labelPlacement="floating" label="Primary" value="Texto de ejemplo" />
        <app-textarea variant="danger" fill="outline" labelPlacement="floating" label="Danger" value="Texto de ejemplo" />
        <app-textarea variant="violet" fill="outline" labelPlacement="floating" label="Violet" value="Texto de ejemplo" />
      </div>
    `,
  }),
};
