import type { Meta, StoryObj } from '@storybook/angular';
import type { ButtonFill, ButtonVariant } from '../button/button';
import { Dialog, type DialogAppearance, type DialogSize } from './dialog';

type DialogStoryArgs = {
  open: boolean;
  title: string;
  description: string;
  size: DialogSize;
  appearance: DialogAppearance;
  closeOnBackdrop: boolean;
  closeOnEscape: boolean;
  closeAriaLabel: string;
  showActions: boolean;
  showCancel: boolean;
  cancelLabel: string;
  cancelVariant: ButtonVariant;
  cancelFill: ButtonFill;
  confirmLabel: string;
  confirmVariant: ButtonVariant;
  confirmFill: ButtonFill;
  confirmDisabled: boolean;
  confirmLoading: boolean;
};

const meta: Meta<DialogStoryArgs> = {
  title: 'Shared UI/Dialog',
  component: Dialog,
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
    cancelVariant: {
      control: 'select',
      options: ['primary', 'secondary', 'neutral', 'danger', 'violet'],
    },
    cancelFill: {
      control: 'inline-radio',
      options: ['default', 'solid', 'outline', 'clear', 'gradient'],
    },
    confirmVariant: {
      control: 'select',
      options: ['primary', 'secondary', 'neutral', 'danger', 'violet'],
    },
    confirmFill: {
      control: 'inline-radio',
      options: ['default', 'solid', 'outline', 'clear', 'gradient'],
    },
  },
  args: {
    open: true,
    title: 'Confirmar cambios',
    description: 'Revisa la informacion antes de guardar la configuracion.',
    size: 'md',
    appearance: 'default',
    closeOnBackdrop: true,
    closeOnEscape: true,
    closeAriaLabel: 'Cerrar dialogo',
    showActions: true,
    showCancel: true,
    cancelLabel: 'Cancelar',
    cancelVariant: 'neutral',
    cancelFill: 'clear',
    confirmLabel: 'Guardar',
    confirmVariant: 'primary',
    confirmFill: 'solid',
    confirmDisabled: false,
    confirmLoading: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <app-dialog
        [open]="open"
        [title]="title"
        [description]="description"
        [size]="size"
        [appearance]="appearance"
        [closeOnBackdrop]="closeOnBackdrop"
        [closeOnEscape]="closeOnEscape"
        [closeAriaLabel]="closeAriaLabel"
        [showActions]="showActions"
        [showCancel]="showCancel"
        [cancelLabel]="cancelLabel"
        [cancelVariant]="cancelVariant"
        [cancelFill]="cancelFill"
        [confirmLabel]="confirmLabel"
        [confirmVariant]="confirmVariant"
        [confirmFill]="confirmFill"
        [confirmDisabled]="confirmDisabled"
        [confirmLoading]="confirmLoading"
      >
        <div class="grid gap-4">
          <p class="m-0 text-sm" style="color: var(--ui-muted-fg)">
            Esta accion actualizara los datos visibles para el usuario.
          </p>
        </div>
      </app-dialog>
    `,
  }),
};

export default meta;

type Story = StoryObj<DialogStoryArgs>;

export const Default: Story = {};

export const Small: Story = {
  args: {
    size: 'sm',
    title: 'Eliminar elemento',
    description: 'Esta accion no se puede deshacer.',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    title: 'Detalle de proyecto',
    description: 'Vista amplia para formularios o contenido con mas contexto.',
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
    title: 'Confirmacion ligera',
    description: 'Mismo dialogo con superficie y sombra mas discretas.',
  },
};

export const DangerAction: Story = {
  args: {
    title: 'Eliminar elemento',
    description: 'Esta accion no se puede deshacer.',
    confirmLabel: 'Eliminar',
    confirmVariant: 'danger',
    confirmFill: 'solid',
  },
};

export const GradientAction: Story = {
  args: {
    title: 'Crear con IA',
    description: 'Genera una primera version usando la configuracion actual.',
    confirmLabel: 'Generar',
    confirmVariant: 'violet',
    confirmFill: 'gradient',
  },
};

export const WithoutCancel: Story = {
  args: {
    showCancel: false,
    confirmLabel: 'Entendido',
    confirmVariant: 'neutral',
  },
};
