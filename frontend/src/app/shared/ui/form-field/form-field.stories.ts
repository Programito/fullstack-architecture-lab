import type { Meta, StoryObj } from '@storybook/angular';
import { FormField, type FormFieldSize } from './form-field';

type FormFieldStoryArgs = {
  controlId: string;
  label: string;
  hint: string;
  error: string;
  size: FormFieldSize;
  required: boolean;
  disabled: boolean;
};

const meta: Meta<FormFieldStoryArgs> = {
  title: 'Shared UI/Form Field',
  component: FormField,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
  },
  args: {
    controlId: 'name-field',
    label: 'Nombre',
    hint: 'Texto de ayuda conectado al control.',
    error: '',
    size: 'md',
    required: false,
    disabled: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm">
        <app-form-field
          [controlId]="controlId"
          [label]="label"
          [hint]="hint"
          [error]="error"
          [size]="size"
          [required]="required"
          [disabled]="disabled"
        >
          <input
            class="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
            [id]="controlId"
            [disabled]="disabled"
            [attr.aria-describedby]="error ? controlId + '-error' : controlId + '-hint'"
            [attr.aria-invalid]="error ? true : null"
          />
        </app-form-field>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<FormFieldStoryArgs>;

export const Default: Story = {};

export const Required: Story = {
  args: {
    required: true,
  },
};

export const Error: Story = {
  args: {
    hint: '',
    error: 'Este campo es obligatorio.',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-4">
        <app-form-field controlId="field-sm" label="Pequeno" hint="Tamano sm" size="sm"><input id="field-sm" class="h-8 w-full rounded-md border px-3 text-sm" /></app-form-field>
        <app-form-field controlId="field-md" label="Mediano" hint="Tamano md"><input id="field-md" class="h-10 w-full rounded-md border px-3 text-sm" /></app-form-field>
        <app-form-field controlId="field-lg" label="Grande" hint="Tamano lg" size="lg"><input id="field-lg" class="h-12 w-full rounded-md border px-3 text-base" /></app-form-field>
      </div>
    `,
  }),
};
