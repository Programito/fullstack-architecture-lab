import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { Tooltip, type TooltipAppearance, type TooltipPosition } from './tooltip';

type TooltipStoryArgs = {
  label: string;
  tooltipText: string;
  tooltipPosition: TooltipPosition;
  tooltipDisabled: boolean;
  tooltipShowDelay: number;
  tooltipHideDelay: number;
  tooltipOffset: number;
  tooltipAppearance: TooltipAppearance;
};

const triggerClasses =
  'rounded-md border px-4 py-2 text-sm font-medium shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300';
const triggerStyles = 'border-color: var(--ui-border); background: var(--ui-bg); color: var(--ui-fg);';

const meta: Meta<TooltipStoryArgs> = {
  title: 'Shared UI/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [Tooltip],
    }),
  ],
  argTypes: {
    tooltipPosition: {
      control: 'inline-radio',
      options: ['auto', 'top', 'bottom', 'left', 'right'],
    },
    tooltipDisabled: {
      control: 'boolean',
    },
    tooltipAppearance: {
      control: 'inline-radio',
      options: ['default', 'minimal'],
    },
  },
  args: {
    label: 'Hover o foco',
    tooltipText: 'Guarda los cambios pendientes.',
    tooltipPosition: 'auto',
    tooltipDisabled: false,
    tooltipShowDelay: 0,
    tooltipHideDelay: 80,
    tooltipOffset: 8,
    tooltipAppearance: 'default',
  },
  render: (args) => ({
    props: args,
    template: `
      <button
        class="${triggerClasses}"
        style="${triggerStyles}"
        type="button"
        [appTooltip]="tooltipText"
        [tooltipPosition]="tooltipPosition"
        [tooltipDisabled]="tooltipDisabled"
        [tooltipShowDelay]="tooltipShowDelay"
        [tooltipHideDelay]="tooltipHideDelay"
        [tooltipOffset]="tooltipOffset"
        [tooltipAppearance]="tooltipAppearance"
      >
        {{ label }}
      </button>
    `,
  }),
};

export default meta;

type Story = StoryObj<TooltipStoryArgs>;

export const Default: Story = {};

export const TemplateContent: Story = {
  render: () => ({
    template: `
      <ng-template #tip>
        <p><strong>Contenido rico</strong></p>
        <p>Usa templates Angular para formato seguro.</p>
      </ng-template>

      <button
        class="${triggerClasses}"
        style="${triggerStyles}"
        type="button"
        [appTooltip]="tip"
      >
        Ver template
      </button>
    `,
  }),
};

export const Positions: Story = {
  render: () => ({
    template: `
      <div class="grid min-h-64 place-items-center">
        <div class="grid grid-cols-3 gap-3">
          <span></span>
          <button class="${triggerClasses}" style="${triggerStyles}" type="button" [appTooltip]="'Arriba'" tooltipPosition="top" [tooltipShowDelay]="0">Top</button>
          <span></span>
          <button class="${triggerClasses}" style="${triggerStyles}" type="button" [appTooltip]="'Izquierda'" tooltipPosition="left" [tooltipShowDelay]="0">Left</button>
          <button class="${triggerClasses}" style="${triggerStyles}" type="button" [appTooltip]="'Automatico'" tooltipPosition="auto" [tooltipShowDelay]="0">Auto</button>
          <button class="${triggerClasses}" style="${triggerStyles}" type="button" [appTooltip]="'Derecha'" tooltipPosition="right" [tooltipShowDelay]="0">Right</button>
          <span></span>
          <button class="${triggerClasses}" style="${triggerStyles}" type="button" [appTooltip]="'Abajo'" tooltipPosition="bottom" [tooltipShowDelay]="0">Bottom</button>
          <span></span>
        </div>
      </div>
    `,
  }),
};

export const AutoPosition: Story = {
  args: {
    label: 'Auto cerca del borde',
    tooltipText: 'La posicion cambia si no hay espacio suficiente.',
    tooltipPosition: 'auto',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="flex min-h-64 items-start justify-end p-2">
        <button
          class="${triggerClasses}"
          style="${triggerStyles}"
          type="button"
          [appTooltip]="tooltipText"
          [tooltipPosition]="tooltipPosition"
          [tooltipShowDelay]="0"
        >
          {{ label }}
        </button>
      </div>
    `,
  }),
};

export const LongText: Story = {
  args: {
    tooltipText:
      'Este tooltip contiene un texto mas largo para validar el ancho maximo, el wrapping y la legibilidad sin romper el layout.',
  },
};

export const Disabled: Story = {
  args: {
    tooltipDisabled: true,
    label: 'Sin tooltip',
  },
};

export const Minimal: Story = {
  args: {
    label: 'Tooltip ligero',
    tooltipText: 'Burbuja con menor peso visual.',
    tooltipAppearance: 'minimal',
  },
};

export const Focus: Story = {
  render: () => ({
    template: `
      <div class="flex flex-wrap gap-3">
        <button class="${triggerClasses}" style="${triggerStyles}" type="button" [appTooltip]="'Vuelve al elemento anterior.'" [tooltipShowDelay]="0">Anterior</button>
        <button class="${triggerClasses}" style="${triggerStyles}" type="button" [appTooltip]="'Tambien aparece al enfocar con teclado.'" [tooltipShowDelay]="0">Enfocable</button>
        <button class="${triggerClasses}" style="${triggerStyles}" type="button" [appTooltip]="'Avanza al siguiente elemento.'" [tooltipShowDelay]="0">Siguiente</button>
      </div>
    `,
  }),
};
