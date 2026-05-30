import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import {
  DEFAULT_PHONE_COUNTRIES,
  PhoneInput,
  type PhoneCountryCode,
  type PhoneCountryOption,
  type PhoneInputAppearance,
  type PhoneInputFill,
  type PhoneInputSize,
  type PhoneInputVariant,
} from './phone-input';

type PhoneInputStoryArgs = {
  id: string | null;
  label: string;
  placeholder: string;
  hint: string;
  error: string;
  value: string;
  country: PhoneCountryCode;
  name: string;
  variant: PhoneInputVariant;
  fill: PhoneInputFill;
  appearance: PhoneInputAppearance;
  size: PhoneInputSize;
  disabled: boolean;
  readonly: boolean;
  required: boolean;
  mobileOnly: boolean;
  countries: PhoneCountryOption[];
};

const meta: Meta<PhoneInputStoryArgs> = {
  title: 'Shared UI/Phone Input',
  component: PhoneInput,
  tags: ['autodocs'],
  argTypes: {
    country: {
      control: 'select',
      options: DEFAULT_PHONE_COUNTRIES.map((option) => option.code),
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
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
  },
  args: {
    id: null,
    label: 'Movil',
    placeholder: '612 345 678',
    hint: 'Guardaremos el telefono en formato internacional.',
    error: '',
    value: '',
    country: 'ES',
    name: 'phone',
    variant: 'primary',
    fill: 'default',
    appearance: 'default',
    size: 'md',
    disabled: false,
    readonly: false,
    required: false,
    mobileOnly: true,
    countries: DEFAULT_PHONE_COUNTRIES,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm">
        <app-phone-input
          [id]="id"
          [label]="label"
          [placeholder]="placeholder"
          [hint]="hint"
          [error]="error"
          [(value)]="value"
          [(country)]="country"
          [name]="name"
          [variant]="variant"
          [fill]="fill"
          [appearance]="appearance"
          [size]="size"
          [disabled]="disabled"
          [readonly]="readonly"
          [required]="required"
          [mobileOnly]="mobileOnly"
          [countries]="countries"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<PhoneInputStoryArgs>;

export const Default: Story = {};

export const WithValue: Story = {
  args: {
    value: '+34612345678',
  },
};

export const Signals: Story = {
  render: () => ({
    props: {
      phone: signal('+34612345678'),
      phoneCountry: signal<PhoneCountryCode>('ES'),
    },
    template: `
      <div class="grid max-w-sm gap-3">
        <app-phone-input label="Movil" [(value)]="phone" [(country)]="phoneCountry" />
        <p class="m-0 text-sm text-zinc-500">Valor: {{ phone() }} · Pais: {{ phoneCountry() }}</p>
      </div>
    `,
  }),
};

export const Error: Story = {
  args: {
    value: '+34123',
    hint: '',
    error: 'Introduce un movil valido.',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: '+34612345678',
  },
};

export const Readonly: Story = {
  args: {
    readonly: true,
    value: '+34612345678',
  },
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-4">
        <app-phone-input size="sm" label="Pequeno" value="+34612345678" />
        <app-phone-input size="md" label="Mediano" value="+34612345678" />
        <app-phone-input size="lg" label="Grande" value="+34612345678" />
      </div>
    `,
  }),
};

export const Fills: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-4">
        <app-phone-input fill="default" label="Default" value="+34612345678" />
        <app-phone-input fill="solid" label="Solid" value="+34612345678" />
        <app-phone-input fill="outline" label="Outline" value="+34612345678" />
      </div>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-4">
        <app-phone-input variant="primary" fill="outline" label="Primary" value="+34612345678" />
        <app-phone-input variant="secondary" fill="outline" label="Secondary" value="+34612345678" />
        <app-phone-input variant="neutral" fill="outline" label="Neutral" value="+34612345678" />
        <app-phone-input variant="danger" fill="outline" label="Danger" value="+34612345678" />
        <app-phone-input variant="violet" fill="outline" label="Violet" value="+34612345678" />
      </div>
    `,
  }),
};

export const ShortCountryList: Story = {
  args: {
    countries: [
      { code: 'ES', label: 'Espana' },
      { code: 'PT', label: 'Portugal' },
      { code: 'FR', label: 'Francia' },
    ],
  },
};
