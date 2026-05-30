import type { Meta, StoryObj } from '@storybook/angular';
import {
  SegmentedControl,
  type SegmentedControlAppearance,
  type SegmentedControlOption,
  type SegmentedControlSize,
  type SegmentedControlVariant,
} from './segmented-control';

type SegmentedControlStoryArgs = {
  ariaLabel: string;
  options: SegmentedControlOption[];
  value: string;
  variant: SegmentedControlVariant;
  appearance: SegmentedControlAppearance;
  size: SegmentedControlSize;
  disabled: boolean;
};

const meta: Meta<SegmentedControlStoryArgs> = {
  title: 'Shared UI/Segmented Control',
  component: SegmentedControl,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['pill', 'underline'],
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
  },
  args: {
    ariaLabel: 'Vista',
    options: [
      { label: 'Resumen', value: 'summary' },
      { label: 'Actividad', value: 'activity' },
      { label: 'Ajustes', value: 'settings' },
    ],
    value: 'summary',
    variant: 'pill',
    appearance: 'default',
    size: 'md',
    disabled: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <app-segmented-control
        [ariaLabel]="ariaLabel"
        [options]="options"
        [value]="value"
        [variant]="variant"
        [appearance]="appearance"
        [size]="size"
        [disabled]="disabled"
        (valueChange)="value = $event"
      />
    `,
  }),
};

export default meta;

type Story = StoryObj<SegmentedControlStoryArgs>;

export const Pill: Story = {};

export const Underline: Story = {
  args: {
    variant: 'underline',
    value: 'activity',
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
  },
};

export const Sizes: Story = {
  render: () => ({
    props: {
      options: [
        { label: 'Dia', value: 'day' },
        { label: 'Semana', value: 'week' },
        { label: 'Mes', value: 'month' },
      ],
    },
    template: `
      <div class="grid gap-4">
        <app-segmented-control ariaLabel="Periodo pequeno" [options]="options" value="day" size="sm" />
        <app-segmented-control ariaLabel="Periodo mediano" [options]="options" value="week" size="md" />
        <app-segmented-control ariaLabel="Periodo grande" [options]="options" value="month" size="lg" />
      </div>
    `,
  }),
};

export const DisabledOption: Story = {
  args: {
    options: [
      { label: 'Todos', value: 'all' },
      { label: 'Activos', value: 'active' },
      { label: 'Archivados', value: 'archived', disabled: true },
    ],
    value: 'active',
  },
};
