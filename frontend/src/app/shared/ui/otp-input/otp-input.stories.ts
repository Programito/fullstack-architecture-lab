import type { Meta, StoryObj } from '@storybook/angular';
import { OtpInput, type OtpInputAppearance, type OtpInputVariant } from './otp-input';

type Args = {
  label: string;
  hint: string;
  error: string;
  value: string;
  length: number;
  variant: OtpInputVariant;
  appearance: OtpInputAppearance;
  masked: boolean;
  disabled: boolean;
  readonly: boolean;
  required: boolean;
};

const meta: Meta<Args> = {
  title: 'Shared UI/Otp Input',
  component: OtpInput,
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
    label: 'Codigo',
    hint: 'Introduce el codigo recibido.',
    error: '',
    value: '',
    length: 6,
    variant: 'primary',
    appearance: 'default',
    masked: false,
    disabled: false,
    readonly: false,
    required: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm">
        <app-otp-input
          [label]="label"
          [hint]="hint"
          [error]="error"
          [(value)]="value"
          [length]="length"
          [variant]="variant"
          [appearance]="appearance"
          [masked]="masked"
          [disabled]="disabled"
          [readonly]="readonly"
          [required]="required"
        />
      </div>
    `,
  }),
};

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};
export const FourDigits: Story = { args: { length: 4 } };
export const Masked: Story = { args: { masked: true, value: '123456' } };
export const Disabled: Story = { args: { disabled: true, value: '123456' } };
export const Error: Story = { args: { hint: '', error: 'Codigo incorrecto.', value: '123' } };
export const CompletedDemo: Story = {
  render: () => ({
    props: { value: '', completed: '' },
    template: `
      <div class="grid max-w-sm gap-3">
        <app-otp-input label="Codigo" [(value)]="value" (completed)="completed = $event" />
        <p class="m-0 text-sm text-zinc-500">Completado: {{ completed || 'pendiente' }}</p>
      </div>
    `,
  }),
};
export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="grid gap-4">
        <app-otp-input label="Pequeno" size="sm" length="4" />
        <app-otp-input label="Mediano" length="4" />
        <app-otp-input label="Grande" size="lg" length="4" />
      </div>
    `,
  }),
};
