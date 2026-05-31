import type { Meta, StoryObj } from '@storybook/angular';
import {
  FloatingActionButton,
  type FloatingActionButtonPosition,
  type FloatingActionButtonSize,
  type FloatingActionButtonVariant,
} from './floating-action-button';

type FloatingActionButtonStoryArgs = {
  icon: string;
  label: string;
  ariaLabel: string;
  extended: boolean;
  variant: FloatingActionButtonVariant;
  size: FloatingActionButtonSize;
  position: FloatingActionButtonPosition;
  disabled: boolean;
  loading: boolean;
};

const meta: Meta<FloatingActionButtonStoryArgs> = {
  title: 'Shared UI/FloatingActionButton',
  component: FloatingActionButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'neutral', 'danger', 'violet'],
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    position: {
      control: 'select',
      options: ['inline', 'bottom-right', 'bottom-left', 'top-right', 'top-left'],
    },
  },
  args: {
    icon: 'add',
    label: 'Crear',
    ariaLabel: '',
    extended: false,
    variant: 'primary',
    size: 'md',
    position: 'inline',
    disabled: false,
    loading: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <app-floating-action-button
        [icon]="icon"
        [label]="label"
        [ariaLabel]="ariaLabel"
        [extended]="extended"
        [variant]="variant"
        [size]="size"
        [position]="position"
        [disabled]="disabled"
        [loading]="loading"
      />
    `,
  }),
};

export default meta;

type Story = StoryObj<FloatingActionButtonStoryArgs>;

export const Default: Story = {};
export const Extended: Story = { args: { extended: true, label: 'Crear proyecto' } };
export const Loading: Story = { args: { loading: true, ariaLabel: 'Creando' } };
export const Disabled: Story = { args: { disabled: true } };
export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-4">
        <app-floating-action-button size="sm" label="Crear" />
        <app-floating-action-button size="md" label="Crear" />
        <app-floating-action-button size="lg" label="Crear" />
      </div>
    `,
  }),
};
export const Variants: Story = {
  render: () => ({
    template: `
      <div class="flex flex-wrap items-center gap-4">
        <app-floating-action-button variant="primary" label="Crear" />
        <app-floating-action-button variant="secondary" label="Crear" />
        <app-floating-action-button variant="neutral" label="Crear" />
        <app-floating-action-button variant="danger" icon="delete" label="Eliminar" />
        <app-floating-action-button variant="violet" icon="auto_awesome" label="Crear con IA" />
      </div>
    `,
  }),
};
export const Positions: Story = {
  render: () => ({
    template: `
      <div style="position: relative; min-height: 20rem; overflow: hidden; border: 1px solid var(--ui-border); border-radius: 0.5rem;">
        <div style="position: absolute; inset: 1rem; display: grid; place-items: center; color: var(--ui-muted-fg);">
          Posiciones fijas en viewport
        </div>
        <app-floating-action-button position="top-left" icon="north_west" label="Arriba izquierda" />
        <app-floating-action-button position="top-right" icon="north_east" label="Arriba derecha" />
        <app-floating-action-button position="bottom-left" icon="south_west" label="Abajo izquierda" />
        <app-floating-action-button position="bottom-right" icon="south_east" label="Abajo derecha" />
      </div>
    `,
  }),
};
