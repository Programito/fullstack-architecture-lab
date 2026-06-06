import type { Meta, StoryObj } from '@storybook/angular';
import { ColorModeMenu, type ColorModeMenuAppearance, type ColorModeMenuSize } from './color-mode-menu';

type ColorModeMenuStoryArgs = {
  appearance: ColorModeMenuAppearance;
  size: ColorModeMenuSize;
  disabled: boolean;
};

const meta: Meta<ColorModeMenuStoryArgs> = {
  title: 'Shared UI/Color Mode Menu',
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
      <div class="inline-flex">
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
