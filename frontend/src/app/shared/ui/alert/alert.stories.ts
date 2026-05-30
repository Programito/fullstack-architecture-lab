import type { Meta, StoryObj } from '@storybook/angular';
import { Alert, type AlertAppearance, type AlertFill, type AlertRole, type AlertSize, type AlertVariant } from './alert';

type AlertStoryArgs = {
  title: string;
  description: string;
  variant: AlertVariant;
  fill: AlertFill;
  appearance: AlertAppearance;
  size: AlertSize;
  role: AlertRole;
  dismissible: boolean;
  dismissAriaLabel: string;
};

const meta: Meta<AlertStoryArgs> = {
  title: 'Shared UI/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'neutral', 'success', 'warning', 'danger', 'violet'],
    },
    fill: {
      control: 'inline-radio',
      options: ['soft', 'outline', 'solid'],
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    role: {
      control: 'inline-radio',
      options: ['status', 'alert', 'note'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
  },
  args: {
    title: 'Cambios guardados',
    description: 'La configuracion se actualizo correctamente.',
    variant: 'success',
    fill: 'soft',
    appearance: 'default',
    size: 'md',
    role: 'status',
    dismissible: false,
    dismissAriaLabel: 'Cerrar alerta',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-lg">
        <app-alert
          [title]="title"
          [description]="description"
          [variant]="variant"
          [fill]="fill"
          [appearance]="appearance"
          [size]="size"
          [role]="role"
          [dismissible]="dismissible"
          [dismissAriaLabel]="dismissAriaLabel"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<AlertStoryArgs>;

export const Default: Story = {};

export const Danger: Story = {
  args: {
    title: 'No se pudo guardar',
    description: 'Revisa los campos marcados antes de continuar.',
    variant: 'danger',
    role: 'alert',
  },
};

export const Dismissible: Story = {
  args: {
    dismissible: true,
    variant: 'primary',
    title: 'Nueva version disponible',
    description: 'Actualiza para obtener las mejoras mas recientes.',
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
    variant: 'primary',
    title: 'Guardando en segundo plano',
    description: 'Puedes seguir trabajando mientras se sincronizan los cambios.',
  },
};

export const Variants: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-lg gap-4">
        <app-alert variant="primary" title="Primary" description="Mensaje informativo principal." />
        <app-alert variant="neutral" title="Neutral" description="Mensaje general sin intencion fuerte." />
        <app-alert variant="success" title="Success" description="La accion se completo correctamente." />
        <app-alert variant="warning" title="Warning" description="Hay detalles que conviene revisar." />
        <app-alert variant="danger" role="alert" title="Danger" description="Se requiere atencion inmediata." />
        <app-alert variant="violet" title="Violet" description="Mensaje destacado o promocional." />
      </div>
    `,
  }),
};

export const Fills: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-lg gap-4">
        <app-alert fill="soft" variant="warning" title="Soft" description="Fondo suave para feedback contextual." />
        <app-alert fill="outline" variant="warning" title="Outline" description="Borde visible con fondo base." />
        <app-alert fill="solid" variant="warning" title="Solid" description="Alerta de alta presencia visual." />
      </div>
    `,
  }),
};

export const SuccessAndWarning: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-lg gap-4">
        <app-alert fill="soft" variant="success" title="Success soft" description="La accion se completo correctamente." />
        <app-alert fill="outline" variant="success" title="Success outline" description="Confirmacion con borde visible." />
        <app-alert fill="solid" variant="success" title="Success solid" description="Confirmacion de mayor presencia." />
        <app-alert fill="soft" variant="warning" title="Warning soft" description="Hay detalles que conviene revisar." />
        <app-alert fill="outline" variant="warning" title="Warning outline" description="Aviso con borde visible." />
        <app-alert fill="solid" variant="warning" title="Warning solid" description="Aviso de mayor presencia." />
      </div>
    `,
  }),
};
