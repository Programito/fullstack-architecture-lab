import type { Meta, StoryObj } from '@storybook/angular';
import { Tabs, type TabsAppearance, type TabsOption, type TabsSize, type TabsVariant } from './tabs';

type TabsStoryArgs = {
  ariaLabel: string;
  options: TabsOption[];
  value: string;
  variant: TabsVariant;
  appearance: TabsAppearance;
  size: TabsSize;
  disabled: boolean;
};

const options: TabsOption[] = [
  { label: 'Resumen', value: 'summary' },
  { label: 'Actividad', value: 'activity' },
  { label: 'Ajustes', value: 'settings' },
];

const meta: Meta<TabsStoryArgs> = {
  title: 'Shared UI/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['underline', 'pill'],
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
    ariaLabel: 'Secciones del proyecto',
    options,
    value: 'summary',
    variant: 'underline',
    appearance: 'default',
    size: 'md',
    disabled: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <app-tabs
        [ariaLabel]="ariaLabel"
        [options]="options"
        [value]="value"
        [variant]="variant"
        [appearance]="appearance"
        [size]="size"
        [disabled]="disabled"
        (valueChange)="value = $event"
      >
        <p class="m-0 max-w-xl text-sm leading-6" style="color: var(--ui-muted-fg)">
          Contenido activo para {{ value }}.
        </p>
      </app-tabs>
    `,
  }),
};

export default meta;

type Story = StoryObj<TabsStoryArgs>;

export const Default: Story = {};

export const Pill: Story = {
  args: {
    variant: 'pill',
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
    variant: 'pill',
  },
};

export const Sizes: Story = {
  render: () => ({
    props: { options },
    template: `
      <div class="grid gap-6">
        <app-tabs [options]="options" value="summary" size="sm">Small tabs</app-tabs>
        <app-tabs [options]="options" value="summary" size="md">Medium tabs</app-tabs>
        <app-tabs [options]="options" value="summary" size="lg">Large tabs</app-tabs>
      </div>
    `,
  }),
};

export const DisabledOption: Story = {
  args: {
    options: [
      { label: 'Resumen', value: 'summary' },
      { label: 'Actividad', value: 'activity', disabled: true },
      { label: 'Ajustes', value: 'settings' },
    ],
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
