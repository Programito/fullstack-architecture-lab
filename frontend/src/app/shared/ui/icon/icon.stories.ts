import type { Meta, StoryObj } from '@storybook/angular';
import { Icon, type IconSize } from './icon';

type IconStoryArgs = {
  name: string;
  size: IconSize;
  fill: boolean;
  decorative: boolean;
  ariaLabel: string;
};

const meta: Meta<IconStoryArgs> = {
  title: 'Shared UI/Icon',
  component: Icon,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
  },
  args: {
    name: 'expand_more',
    size: 'md',
    fill: false,
    decorative: true,
    ariaLabel: '',
  },
};

export default meta;

type Story = StoryObj<IconStoryArgs>;

export const Default: Story = {};

export const Labelled: Story = {
  args: {
    name: 'upload_file',
    decorative: false,
    ariaLabel: 'Subir archivo',
  },
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-4">
        <app-icon name="check" size="sm" />
        <app-icon name="check" size="md" />
        <app-icon name="check" size="lg" />
      </div>
    `,
  }),
};

export const Filled: Story = {
  args: {
    name: 'favorite',
    fill: true,
  },
};

export const CommonUiIcons: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-4 text-zinc-700">
        <app-icon name="expand_more" />
        <app-icon name="close" />
        <app-icon name="check" />
        <app-icon name="upload_file" />
        <app-icon name="search" />
        <app-icon name="calendar_month" />
      </div>
    `,
  }),
};
