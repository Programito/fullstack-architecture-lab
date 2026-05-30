import type { Meta, StoryObj } from '@storybook/angular';
import { Banner, type BannerAppearance, type BannerFill, type BannerSize, type BannerVariant } from './banner';

type BannerStoryArgs = {
  eyebrow: string;
  title: string;
  description: string;
  variant: BannerVariant;
  fill: BannerFill;
  appearance: BannerAppearance;
  size: BannerSize;
  actionLabel: string;
  secondaryActionLabel: string;
  dismissible: boolean;
  dismissAriaLabel: string;
};

const meta: Meta<BannerStoryArgs> = {
  title: 'Shared UI/Banner',
  component: Banner,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'neutral', 'success', 'warning', 'danger', 'violet'],
    },
    fill: {
      control: 'inline-radio',
      options: ['soft', 'outline', 'solid', 'gradient'],
    },
    size: {
      control: 'inline-radio',
      options: ['md', 'lg'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
  },
  args: {
    eyebrow: 'Nuevo',
    title: 'Automatiza tu siguiente flujo',
    description: 'Configura reglas y revisa recomendaciones sin salir del panel.',
    variant: 'primary',
    fill: 'soft',
    appearance: 'default',
    size: 'md',
    actionLabel: 'Crear automatizacion',
    secondaryActionLabel: '',
    dismissible: false,
    dismissAriaLabel: 'Cerrar banner',
  },
  render: (args) => ({
    props: {
      ...args,
      handleAction: () => undefined,
      handleSecondaryAction: () => undefined,
      handleDismissed: () => undefined,
    },
    template: `
      <app-banner
        [eyebrow]="eyebrow"
        [title]="title"
        [description]="description"
        [variant]="variant"
        [fill]="fill"
        [appearance]="appearance"
        [size]="size"
        [actionLabel]="actionLabel"
        [secondaryActionLabel]="secondaryActionLabel"
        [dismissible]="dismissible"
        [dismissAriaLabel]="dismissAriaLabel"
        (action)="handleAction()"
        (secondaryAction)="handleSecondaryAction()"
        (dismissed)="handleDismissed()"
      />
    `,
  }),
};

export default meta;

type Story = StoryObj<BannerStoryArgs>;

export const Default: Story = {};

export const WithActions: Story = {
  args: {
    secondaryActionLabel: 'Ver detalles',
  },
};

export const Dismissible: Story = {
  args: {
    dismissible: true,
    secondaryActionLabel: 'Mas tarde',
  },
};

export const Gradient: Story = {
  args: {
    eyebrow: 'Beta',
    title: 'Crea contenido asistido',
    description: 'Prueba el nuevo flujo guiado para generar briefs, tareas y resumenes.',
    fill: 'gradient',
    variant: 'violet',
    size: 'lg',
    actionLabel: 'Probar ahora',
    secondaryActionLabel: 'Ver novedades',
  },
};

export const Warning: Story = {
  args: {
    eyebrow: 'Revision',
    title: 'Quedan campos por completar',
    description: 'Completa la configuracion para activar este espacio.',
    variant: 'warning',
    actionLabel: 'Completar',
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
    eyebrow: '',
    title: 'Sincronizacion activa',
    description: 'Los cambios se guardan automaticamente.',
    actionLabel: 'Ver estado',
  },
};

export const Danger: Story = {
  args: {
    eyebrow: 'Atencion',
    title: 'La sincronizacion esta pausada',
    description: 'Revisa las credenciales antes de continuar.',
    variant: 'danger',
    fill: 'outline',
    actionLabel: 'Revisar conexion',
  },
};

export const CompactContent: Story = {
  args: {
    eyebrow: '',
    title: 'Invita a tu equipo',
    description: '',
    actionLabel: 'Invitar',
    secondaryActionLabel: 'Copiar enlace',
  },
};

export const Variants: Story = {
  render: () => ({
    template: `
      <div class="grid gap-4">
        <app-banner variant="primary" title="Primary" description="Anuncio principal con accion sugerida." actionLabel="Continuar" />
        <app-banner variant="neutral" title="Neutral" description="Mensaje general de pagina." actionLabel="Abrir" />
        <app-banner variant="success" title="Success" description="Confirmacion amplia para un flujo terminado." actionLabel="Ver resultado" />
        <app-banner variant="warning" title="Warning" description="Aviso que conviene revisar." actionLabel="Revisar" />
        <app-banner variant="danger" title="Danger" description="Problema que requiere atencion." actionLabel="Resolver" />
        <app-banner variant="violet" title="Violet" description="Mensaje destacado de producto." actionLabel="Explorar" />
      </div>
    `,
  }),
};

export const Fills: Story = {
  render: () => ({
    template: `
      <div class="grid gap-4">
        <app-banner fill="soft" variant="violet" title="Soft" description="Fondo suave para presencia media." actionLabel="Continuar" />
        <app-banner fill="outline" variant="violet" title="Outline" description="Borde visible y fondo base." actionLabel="Continuar" />
        <app-banner fill="solid" variant="violet" title="Solid" description="Alta presencia para mensajes importantes." actionLabel="Continuar" />
        <app-banner fill="gradient" variant="violet" title="Gradient" description="Banner destacado para novedades o promos." actionLabel="Continuar" />
      </div>
    `,
  }),
};
