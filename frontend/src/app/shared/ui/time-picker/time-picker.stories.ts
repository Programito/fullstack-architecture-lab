import type { Meta, StoryObj } from '@storybook/angular';
import {
  TimePicker,
  type TimePickerAppearance,
  type TimePickerFill,
  type TimePickerSize,
  type TimePickerVariant,
} from './time-picker';

type TimePickerStoryArgs = {
  id: string | null;
  label: string;
  placeholder: string;
  hint: string;
  error: string;
  value: string;
  name: string;
  min: string;
  max: string;
  minuteStep: number;
  variant: TimePickerVariant;
  fill: TimePickerFill;
  appearance: TimePickerAppearance;
  size: TimePickerSize;
  disabled: boolean;
  required: boolean;
};

const meta: Meta<TimePickerStoryArgs> = {
  title: 'Shared UI/Time Picker',
  component: TimePicker,
  tags: ['autodocs'],
  argTypes: {
    minuteStep: {
      control: 'number',
    },
    fill: {
      control: 'inline-radio',
      options: ['default', 'solid', 'outline'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'neutral', 'danger', 'violet'],
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
  },
  args: {
    id: null,
    label: 'Hora',
    placeholder: 'Selecciona hora',
    hint: 'Elige una hora disponible.',
    error: '',
    value: '',
    name: 'startsAt',
    min: '',
    max: '',
    minuteStep: 15,
    variant: 'primary',
    fill: 'default',
    appearance: 'default',
    size: 'md',
    disabled: false,
    required: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm">
        <app-time-picker
          [id]="id"
          [label]="label"
          [placeholder]="placeholder"
          [hint]="hint"
          [error]="error"
          [value]="value"
          [name]="name"
          [min]="min"
          [max]="max"
          [minuteStep]="minuteStep"
          [variant]="variant"
          [fill]="fill"
          [appearance]="appearance"
          [size]="size"
          [disabled]="disabled"
          [required]="required"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<TimePickerStoryArgs>;

export const Default: Story = {};

export const WithValue: Story = {
  args: {
    value: '09:30',
  },
};

export const MinuteSteps: Story = {
  args: {
    label: 'Hora de inicio',
    hint: 'Opciones cada 30 minutos, con escritura directa si necesitas otro minuto.',
    minuteStep: 30,
    value: '10:00',
  },
};

export const MinMax: Story = {
  args: {
    label: 'Hora disponible',
    hint: 'Solo se puede elegir entre 09:00 y 18:00.',
    min: '09:00',
    max: '18:00',
    value: '12:00',
  },
};

export const Error: Story = {
  args: {
    hint: '',
    error: 'Selecciona una hora valida.',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: '09:30',
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
    label: 'Hora secundaria',
    hint: 'Control con fondo y sombra reducidos.',
    value: '09:30',
  },
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-4">
        <app-time-picker size="sm" label="Pequeno" value="09:00" />
        <app-time-picker size="md" label="Mediano" value="09:30" />
        <app-time-picker size="lg" label="Grande" value="10:00" />
      </div>
    `,
  }),
};

export const Fills: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-4">
        <app-time-picker fill="default" label="Default" value="09:00" />
        <app-time-picker fill="solid" label="Solid" value="09:30" />
        <app-time-picker fill="outline" label="Outline" value="10:00" />
      </div>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-4">
        <app-time-picker variant="primary" fill="outline" label="Primary" value="09:00" />
        <app-time-picker variant="secondary" fill="outline" label="Secondary" value="09:30" />
        <app-time-picker variant="neutral" fill="outline" label="Neutral" value="10:00" />
        <app-time-picker variant="danger" fill="outline" label="Danger" value="10:30" />
        <app-time-picker variant="violet" fill="outline" label="Violet" value="11:00" />
      </div>
    `,
  }),
};
