import type { Meta, StoryObj } from '@storybook/angular';
import type { SelectSize } from '../select/select';
import { LanguageSelect, type LanguageSelectAppearance, type LanguageSelectPlacement } from './language-select';

type LanguageSelectStoryArgs = {
  label: string;
  name: string;
  hint: string;
  appearance: LanguageSelectAppearance;
  placement: LanguageSelectPlacement;
  size: SelectSize;
  disabled: boolean;
  showLabel: boolean;
  showHint: boolean;
};

const meta: Meta<LanguageSelectStoryArgs> = {
  title: 'Shared UI/Language Select',
  component: LanguageSelect,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
    placement: {
      control: 'inline-radio',
      options: ['bottom', 'top'],
    },
  },
  args: {
    label: '',
    name: 'locale',
    hint: '',
    appearance: 'default',
    placement: 'bottom',
    size: 'md',
    disabled: false,
    showLabel: true,
    showHint: true,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="inline-flex">
        <app-language-select
          [label]="label"
          [name]="name"
          [hint]="hint"
          [appearance]="appearance"
          [placement]="placement"
          [size]="size"
          [disabled]="disabled"
          [showLabel]="showLabel"
          [showHint]="showHint"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<LanguageSelectStoryArgs>;

export const Default: Story = {};

export const Spanish: Story = {
  globals: {
    locale: 'es',
  },
};

export const English: Story = {
  globals: {
    locale: 'en',
  },
};

export const Catalan: Story = {
  globals: {
    locale: 'ca',
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
    hint: '',
  },
};

export const Compact: Story = {
  args: {
    appearance: 'minimal',
    size: 'sm',
    showLabel: false,
    showHint: false,
  },
};

export const OpensUpward: Story = {
  args: {
    appearance: 'minimal',
    placement: 'top',
    showLabel: false,
    showHint: false,
  },
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="flex flex-wrap items-end gap-4">
        <app-language-select size="sm" hint="" />
        <app-language-select size="md" hint="" />
        <app-language-select size="lg" hint="" />
      </div>
    `,
  }),
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
