import type { Meta, StoryObj } from '@storybook/angular';
import {
  DatePicker,
  type DatePickerAppearance,
  type DatePickerFill,
  type DatePickerMode,
  type DatePickerSize,
  type DatePickerVariant,
  type DatePickerWeekStartsOn,
} from './date-picker';

type DatePickerStoryArgs = {
  mode: DatePickerMode;
  label: string;
  placeholder: string;
  hint: string;
  error: string;
  value: string;
  startValue: string;
  endValue: string;
  dateFormat: string;
  weekStartsOn: DatePickerWeekStartsOn;
  name: string;
  min: string;
  max: string;
  variant: DatePickerVariant;
  fill: DatePickerFill;
  appearance: DatePickerAppearance;
  size: DatePickerSize;
  disabled: boolean;
  required: boolean;
};

const meta: Meta<DatePickerStoryArgs> = {
  title: 'Shared UI/Date Picker',
  component: DatePicker,
  tags: ['autodocs'],
  argTypes: {
    mode: {
      control: 'inline-radio',
      options: ['single', 'range'],
    },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'neutral', 'danger', 'violet'],
    },
    fill: {
      control: 'inline-radio',
      options: ['default', 'solid', 'outline'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    weekStartsOn: {
      control: 'inline-radio',
      options: [0, 1],
    },
  },
  args: {
    mode: 'single',
    label: 'Fecha',
    placeholder: '',
    hint: 'Usa formato ISO para guardar el valor.',
    error: '',
    value: '2026-05-25',
    startValue: '',
    endValue: '',
    dateFormat: 'd MMM yyyy',
    weekStartsOn: 1,
    name: 'date',
    min: '',
    max: '',
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
        <app-date-picker
          [mode]="mode"
          [label]="label"
          [placeholder]="placeholder"
          [hint]="hint"
          [error]="error"
          [value]="value"
          [startValue]="startValue"
          [endValue]="endValue"
          [dateFormat]="dateFormat"
          [weekStartsOn]="weekStartsOn"
          [name]="name"
          [min]="min"
          [max]="max"
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

type Story = StoryObj<DatePickerStoryArgs>;

export const Default: Story = {};

export const Range: Story = {
  args: {
    mode: 'range',
    label: 'Periodo',
    value: '',
    startValue: '2026-05-12',
    endValue: '',
    name: 'period',
  },
};

export const RangeSelected: Story = {
  args: {
    mode: 'range',
    label: 'Periodo',
    value: '',
    startValue: '2026-05-12',
    endValue: '2026-05-20',
    name: 'period',
    variant: 'violet',
  },
};

export const Variants: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-4">
        <app-date-picker label="Primary" value="2026-05-25" variant="primary" />
        <app-date-picker label="Secondary" value="2026-05-25" variant="secondary" />
        <app-date-picker label="Neutral" value="2026-05-25" variant="neutral" />
        <app-date-picker label="Danger" value="2026-05-25" variant="danger" />
        <app-date-picker label="Violet" value="2026-05-25" variant="violet" />
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-4">
        <app-date-picker label="Pequeno" value="2026-05-25" size="sm" />
        <app-date-picker label="Mediano" value="2026-05-25" size="md" />
        <app-date-picker label="Grande" value="2026-05-25" size="lg" />
      </div>
    `,
  }),
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
    label: 'Fecha secundaria',
    hint: 'Menor presencia visual para filtros densos.',
  },
};

export const Error: Story = {
  args: {
    hint: '',
    error: 'Selecciona una fecha valida.',
    value: '',
  },
};

export const MinMax: Story = {
  args: {
    hint: 'Solo se puede seleccionar entre el 10 y el 20 de mayo.',
    value: '2026-05-12',
    min: '2026-05-10',
    max: '2026-05-20',
  },
};

export const CustomFormat: Story = {
  args: {
    label: 'Fecha',
    value: '2026-05-25',
    dateFormat: 'dd/MM/yyyy',
    hint: 'El valor interno sigue siendo ISO, solo cambia el texto mostrado.',
  },
};

export const SundayStart: Story = {
  args: {
    label: 'Fecha',
    value: '2026-05-25',
    weekStartsOn: 0,
    hint: 'El calendario empieza en domingo para contextos que lo necesiten.',
  },
};

export const FastNavigation: Story = {
  args: {
    label: 'Fecha de inicio',
    value: '2026-05-25',
    hint: 'Abre el calendario y pulsa el titulo del mes para cambiar ano y mes rapidamente.',
  },
};

export const Locales: Story = {
  globals: {
    locale: 'ca',
  },
  args: {
    mode: 'range',
    label: 'Periode',
    value: '',
    startValue: '2026-05-12',
    endValue: '2026-05-20',
    variant: 'violet',
  },
};
