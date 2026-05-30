import type { Meta, StoryObj } from '@storybook/angular';
import {
  DropdownMenu,
  type DropdownMenuAppearance,
  type DropdownMenuItem,
  type DropdownMenuPlacement,
  type DropdownMenuSize,
  type DropdownMenuVariant,
} from './dropdown-menu';

const items: DropdownMenuItem[] = [
  { label: 'Editar', value: 'edit', icon: 'edit', description: 'Modificar el registro' },
  { label: 'Duplicar', value: 'duplicate', icon: 'content_copy' },
  { label: 'Archivar', value: 'archive', icon: 'archive', disabled: true },
  { label: 'Eliminar', value: 'delete', icon: 'delete', danger: true },
];

type DropdownMenuStoryArgs = {
  items: DropdownMenuItem[];
  label: string;
  ariaLabel: string;
  disabled: boolean;
  size: DropdownMenuSize;
  variant: DropdownMenuVariant;
  appearance: DropdownMenuAppearance;
  placement: DropdownMenuPlacement;
  open: boolean;
};

const meta: Meta<DropdownMenuStoryArgs> = {
  title: 'Shared UI/DropdownMenu',
  component: DropdownMenu,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'neutral', 'danger', 'violet'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
  },
  args: {
    items,
    label: 'Acciones',
    ariaLabel: '',
    disabled: false,
    size: 'md',
    variant: 'neutral',
    appearance: 'default',
    placement: 'bottom-end',
    open: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; min-height: 16rem; align-items: flex-start; justify-content: flex-start; padding: 2rem;">
        <app-dropdown-menu
          [items]="items"
          [label]="label"
          [ariaLabel]="ariaLabel"
          [disabled]="disabled"
          [size]="size"
          [variant]="variant"
          [appearance]="appearance"
          [placement]="placement"
          [(open)]="open"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<DropdownMenuStoryArgs>;

export const Default: Story = { args: { open: true, placement: 'bottom-start' } };
export const WithIcons: Story = { args: { open: true, placement: 'bottom-start' } };
export const Disabled: Story = { args: { disabled: true, placement: 'bottom-start' } };
export const DangerItem: Story = { args: { open: true, placement: 'bottom-start' } };
export const Sizes: Story = {
  render: () => ({
    props: { items },
    template: `
      <div style="display: flex; min-height: 16rem; align-items: flex-start; gap: 1rem; padding: 2rem;">
        <app-dropdown-menu label="Pequeno" size="sm" [items]="items" />
        <app-dropdown-menu label="Mediano" [items]="items" />
        <app-dropdown-menu label="Grande" size="lg" [items]="items" />
      </div>
    `,
  }),
};
export const Variants: Story = {
  render: () => ({
    props: { items },
    template: `
      <div style="display: flex; min-height: 16rem; flex-wrap: wrap; align-items: flex-start; gap: 1rem; padding: 2rem;">
        <app-dropdown-menu label="Primary" variant="primary" [items]="items" />
        <app-dropdown-menu label="Secondary" variant="secondary" [items]="items" />
        <app-dropdown-menu label="Neutral" variant="neutral" [items]="items" />
        <app-dropdown-menu label="Danger" variant="danger" [items]="items" />
        <app-dropdown-menu label="Violet" variant="violet" [items]="items" />
      </div>
    `,
  }),
};
