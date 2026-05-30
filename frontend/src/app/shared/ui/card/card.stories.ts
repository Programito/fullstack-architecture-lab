import type { Meta, StoryObj } from '@storybook/angular';
import { Card, type CardAppearance, type CardPadding, type CardVariant } from './card';

type CardStoryArgs = {
  variant: CardVariant;
  appearance: CardAppearance;
  padding: CardPadding;
};

const meta: Meta<CardStoryArgs> = {
  title: 'Shared UI/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'outlined', 'filled'],
    },
    padding: {
      control: 'inline-radio',
      options: ['none', 'sm', 'md', 'lg'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
  },
  args: {
    variant: 'default',
    appearance: 'default',
    padding: 'md',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm">
        <app-card [variant]="variant" [appearance]="appearance" [padding]="padding">
          <div class="grid gap-2">
            <h3 class="m-0 text-base font-semibold">Resumen de cuenta</h3>
            <p class="m-0 text-sm" style="color: var(--ui-muted-fg)">Actividad reciente y estado principal del usuario.</p>
          </div>
        </app-card>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<CardStoryArgs>;

export const Default: Story = {};

export const Elevated: Story = {
  args: {
    variant: 'elevated',
  },
};

export const Filled: Story = {
  args: {
    variant: 'filled',
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
  },
};

export const Variants: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-4">
        <app-card variant="default"><strong>Default</strong><p class="m-0 mt-2 text-sm" style="color: var(--ui-muted-fg)">Superficie base con borde.</p></app-card>
        <app-card variant="elevated"><strong>Elevated</strong><p class="m-0 mt-2 text-sm" style="color: var(--ui-muted-fg)">Superficie con sombra ligera.</p></app-card>
        <app-card variant="outlined"><strong>Outlined</strong><p class="m-0 mt-2 text-sm" style="color: var(--ui-muted-fg)">Superficie de contorno explicito.</p></app-card>
        <app-card variant="filled"><strong>Filled</strong><p class="m-0 mt-2 text-sm" style="color: var(--ui-muted-fg)">Superficie rellena para agrupaciones suaves.</p></app-card>
      </div>
    `,
  }),
};
