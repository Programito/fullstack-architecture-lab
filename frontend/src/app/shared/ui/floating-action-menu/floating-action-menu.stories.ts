import type { Meta, StoryObj } from '@storybook/angular';
import {
  FloatingActionMenu,
  type FloatingActionMenuAction,
  type FloatingActionMenuDirection,
  type FloatingActionMenuPosition,
} from './floating-action-menu';
import type { FloatingActionButtonSize, FloatingActionButtonVariant } from '../floating-action-button/floating-action-button';

type FloatingActionMenuStoryArgs = {
  icon: string;
  label: string;
  ariaLabel: string;
  variant: FloatingActionButtonVariant;
  size: FloatingActionButtonSize;
  position: FloatingActionMenuPosition;
  direction: FloatingActionMenuDirection;
  disabled: boolean;
  open: boolean;
  actions: FloatingActionMenuAction[];
};

const actions: FloatingActionMenuAction[] = [
  { id: 'task', icon: 'checklist', label: 'Nueva tarea' },
  { id: 'project', icon: 'folder', label: 'Nuevo proyecto' },
  { id: 'invite', icon: 'person_add', label: 'Invitar usuario', variant: 'violet' },
];

const meta: Meta<FloatingActionMenuStoryArgs> = {
  title: 'Shared UI/FloatingActionMenu',
  component: FloatingActionMenu,
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
    direction: {
      control: 'inline-radio',
      options: ['up', 'down', 'left', 'right'],
    },
  },
  args: {
    icon: 'add',
    label: 'Crear',
    ariaLabel: '',
    variant: 'primary',
    size: 'md',
    position: 'inline',
    direction: 'up',
    disabled: false,
    open: false,
    actions,
  },
  render: (args) => ({
    props: args,
    template: `
      <app-floating-action-menu
        [icon]="icon"
        [label]="label"
        [ariaLabel]="ariaLabel"
        [variant]="variant"
        [size]="size"
        [position]="position"
        [direction]="direction"
        [disabled]="disabled"
        [open]="open"
        [actions]="actions"
      />
    `,
  }),
};

export default meta;

type Story = StoryObj<FloatingActionMenuStoryArgs>;

export const Default: Story = {};
export const BottomRightUp: Story = {
  args: { position: 'bottom-right', direction: 'up', open: true },
};
export const BottomRightLeft: Story = {
  args: { position: 'bottom-right', direction: 'left', open: true },
};
export const Variants: Story = {
  render: () => ({
    props: { actions },
    template: `
      <div class="flex flex-wrap items-center gap-6">
        <app-floating-action-menu variant="primary" label="Crear" [actions]="actions" open />
        <app-floating-action-menu variant="secondary" label="Publicar" icon="publish" [actions]="actions" open />
        <app-floating-action-menu variant="neutral" label="Opciones" icon="more_horiz" [actions]="actions" open />
        <app-floating-action-menu variant="danger" label="Eliminar" icon="delete" [actions]="actions" open />
        <app-floating-action-menu variant="violet" label="Crear con IA" icon="auto_awesome" [actions]="actions" open />
      </div>
    `,
  }),
};
export const Disabled: Story = { args: { disabled: true } };
export const ActionDisabled: Story = {
  args: {
    open: true,
    actions: [
      { id: 'task', icon: 'checklist', label: 'Nueva tarea' },
      { id: 'archive', icon: 'archive', label: 'Archivar', disabled: true },
      { id: 'delete', icon: 'delete', label: 'Eliminar', variant: 'danger' },
    ],
  },
};
