import type { Meta, StoryObj } from '@storybook/angular';
import {
  Button,
  type ButtonAppearance,
  type ButtonExpand,
  type ButtonFill,
  type ButtonShape,
  type ButtonSize,
  type ButtonType,
  type ButtonVariant,
} from './button';

type ButtonStoryArgs = {
  label: string;
  variant: ButtonVariant;
  fill: ButtonFill;
  appearance: ButtonAppearance;
  expand: ButtonExpand;
  shape: ButtonShape;
  size: ButtonSize;
  type: ButtonType;
  ariaLabel: string;
  disabled: boolean;
  loading: boolean;
};

const meta: Meta<ButtonStoryArgs> = {
  title: 'Shared UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'neutral', 'danger', 'violet'],
    },
    fill: {
      control: 'inline-radio',
      options: ['default', 'solid', 'outline', 'clear', 'gradient'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
    expand: {
      control: 'inline-radio',
      options: ['default', 'block', 'full'],
    },
    shape: {
      control: 'inline-radio',
      options: ['default', 'round'],
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    type: {
      control: 'inline-radio',
      options: ['button', 'submit', 'reset'],
    },
  },
  args: {
    label: 'Crear proyecto',
    variant: 'primary',
    fill: 'default',
    appearance: 'default',
    expand: 'default',
    shape: 'default',
    size: 'md',
    type: 'button',
    ariaLabel: '',
    disabled: false,
    loading: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <app-button
        [variant]="variant"
        [fill]="fill"
        [appearance]="appearance"
        [expand]="expand"
        [shape]="shape"
        [size]="size"
        [type]="type"
        [ariaLabel]="ariaLabel"
        [disabled]="disabled"
        [loading]="loading"
      >
        {{ label }}
      </app-button>
    `,
  }),
};

export default meta;

type Story = StoryObj<ButtonStoryArgs>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: {
    label: 'Cancelar',
    variant: 'secondary',
  },
};

export const Outline: Story = {
  args: {
    label: 'Ver detalles',
    fill: 'outline',
  },
};

export const Clear: Story = {
  args: {
    label: 'Ver detalles',
    fill: 'clear',
  },
};

export const Minimal: Story = {
  args: {
    label: 'Accion secundaria',
    appearance: 'minimal',
    variant: 'neutral',
  },
};

export const Danger: Story = {
  args: {
    label: 'Eliminar',
    variant: 'danger',
  },
};

export const Violet: Story = {
  args: {
    label: 'Crear con IA',
    variant: 'violet',
  },
};

export const Gradient: Story = {
  args: {
    label: 'Crear con IA',
    fill: 'gradient',
  },
};

export const Loading: Story = {
  args: {
    label: 'Guardando',
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    label: 'No disponible',
    disabled: true,
  },
};

export const Block: Story = {
  args: {
    label: 'Continuar',
    expand: 'block',
  },
};

export const Full: Story = {
  args: {
    label: 'Accion principal',
    expand: 'full',
  },
};

export const Round: Story = {
  args: {
    label: 'Continuar',
    shape: 'round',
  },
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-3">
        <app-button size="sm">Pequeno</app-button>
        <app-button size="md">Mediano</app-button>
        <app-button size="lg">Grande</app-button>
      </div>
    `,
  }),
};

export const Fills: Story = {
  render: () => ({
    template: `
      <div class="flex flex-wrap items-center gap-3">
        <app-button fill="solid">Solid</app-button>
        <app-button fill="outline">Outline</app-button>
        <app-button fill="clear">Clear</app-button>
        <app-button fill="gradient">Gradient</app-button>
      </div>
    `,
  }),
};

export const Shapes: Story = {
  render: () => ({
    template: `
      <div class="flex flex-wrap items-center gap-3">
        <app-button>Default</app-button>
        <app-button shape="round">Round</app-button>
        <app-button shape="round" fill="outline">Round outline</app-button>
      </div>
    `,
  }),
};

export const IconOnly: Story = {
  args: {
    label: '+',
    ariaLabel: 'Crear elemento',
    shape: 'round',
  },
};
