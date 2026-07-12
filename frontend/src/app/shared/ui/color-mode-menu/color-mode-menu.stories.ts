import type { Meta, StoryObj } from '@storybook/angular';
import { ColorModeMenu, type ColorModeMenuAppearance, type ColorModeMenuSize } from './color-mode-menu';

type ColorModeMenuStoryArgs = {
  appearance: ColorModeMenuAppearance;
  size: ColorModeMenuSize;
  disabled: boolean;
};

const meta: Meta<ColorModeMenuStoryArgs> = {
  title: 'Shared UI/Theme Toggle',
  component: ColorModeMenu,
  tags: ['autodocs'],
  argTypes: {
    appearance: {
      control: 'inline-radio',
      options: ['default', 'minimal'],
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md'],
    },
  },
  args: {
    appearance: 'minimal',
    size: 'sm',
    disabled: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="inline-flex rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <app-color-mode-menu [appearance]="appearance" [size]="size" [disabled]="disabled" />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ColorModeMenuStoryArgs>;

export const Default: Story = {};

export const DefaultAppearance: Story = {
  args: {
    appearance: 'default',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const Showcase: Story = {
  render: () => ({
    template: `
      <div class="grid gap-4">
        <div class="inline-flex rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <app-color-mode-menu appearance="minimal" size="sm" />
        </div>

        <div class="inline-flex rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <app-color-mode-menu appearance="default" size="md" />
        </div>
      </div>
    `,
  }),
};
