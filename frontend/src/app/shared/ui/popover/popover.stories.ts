import type { Meta, StoryObj } from '@storybook/angular';
import { Popover, type PopoverAppearance, type PopoverPosition } from './popover';
import { Button } from '../button/button';

type PopoverStoryArgs = {
  open: boolean;
  appearance: PopoverAppearance;
  placement: PopoverPosition;
  offset: number;
  disabled: boolean;
  closeOnEscape: boolean;
  closeOnOutsideClick: boolean;
  ariaLabel: string;
};

const meta: Meta<PopoverStoryArgs> = {
  title: 'Shared UI/Popover',
  component: Popover,
  tags: ['autodocs'],
  argTypes: {
    placement: {
      control: 'inline-radio',
      options: ['auto', 'top', 'bottom', 'left', 'right'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
  },
  args: {
    open: false,
    appearance: 'default',
    placement: 'auto',
    offset: 8,
    disabled: false,
    closeOnEscape: true,
    closeOnOutsideClick: true,
    ariaLabel: 'Opciones rapidas',
  },
  render: (args) => ({
    props: args,
    moduleMetadata: {
      imports: [Button],
    },
    template: `
      <div class="p-24">
        <app-popover
          [open]="open"
          [appearance]="appearance"
          [placement]="placement"
          [offset]="offset"
          [disabled]="disabled"
          [closeOnEscape]="closeOnEscape"
          [closeOnOutsideClick]="closeOnOutsideClick"
          [ariaLabel]="ariaLabel"
          (openChange)="open = $event"
        >
          <span popoverTrigger>Opciones</span>
          <div popoverPanel class="grid gap-3">
            <p class="text-sm" style="color: var(--ui-muted-fg)">Ajusta acciones breves sin abandonar la pantalla.</p>
            <div class="flex gap-2">
              <app-button size="sm">Guardar</app-button>
              <app-button size="sm" fill="clear" variant="neutral">Cancelar</app-button>
            </div>
          </div>
        </app-popover>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<PopoverStoryArgs>;

export const Default: Story = {};

export const Open: Story = {
  args: {
    open: true,
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
    open: true,
  },
};

export const Placements: Story = {
  render: () => ({
    template: `
      <div class="grid min-h-80 place-items-center">
        <div class="grid grid-cols-2 gap-16">
          @for (placement of ['top', 'bottom', 'left', 'right']; track placement) {
            <app-popover [open]="true" [placement]="placement" [ariaLabel]="'Popover ' + placement">
              <span popoverTrigger>{{ placement }}</span>
              <p popoverPanel>Panel {{ placement }}</p>
            </app-popover>
          }
        </div>
      </div>
    `,
  }),
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
