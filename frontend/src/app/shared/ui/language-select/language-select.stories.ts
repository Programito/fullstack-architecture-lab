import type { Meta, StoryObj } from '@storybook/angular';
import type { SelectSize } from '../select/select';
import { LanguageSelect, type LanguageSelectAppearance } from './language-select';

type LanguageSelectStoryArgs = {
  label: string;
  name: string;
  hint: string;
  appearance: LanguageSelectAppearance;
  size: SelectSize;
  disabled: boolean;
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
  },
  args: {
    label: 'Idioma',
    name: 'locale',
    hint: 'La preferencia se aplica a la interfaz.',
    appearance: 'default',
    size: 'md',
    disabled: false,
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
          [size]="size"
          [disabled]="disabled"
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
