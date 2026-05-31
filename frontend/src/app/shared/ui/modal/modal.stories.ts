import { Component, Input, inject, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { Button } from '../button/button';
import { MODAL_DATA, ModalController, ModalRef, type ModalAppearance, type ModalSize } from './modal';

type ModalDemoData = {
  message?: string;
};

type ModalDemoResult = {
  saved: boolean;
};

@Component({
  selector: 'app-modal-demo-content',
  standalone: true,
  imports: [Button],
  template: `
    <div class="grid gap-4">
      <p class="m-0 text-sm" style="color: var(--ui-muted-fg)">
        {{ data.message || 'Contenido renderizado desde un componente dinamico.' }}
      </p>

      <div class="flex flex-wrap justify-end gap-2">
        <app-button fill="clear" variant="neutral" (pressed)="modalRef.close()">Cancelar</app-button>
        <app-button (pressed)="modalRef.close({ saved: true })">Guardar</app-button>
      </div>
    </div>
  `,
})
class ModalDemoContent {
  protected readonly data = (inject(MODAL_DATA) ?? {}) as ModalDemoData;
  protected readonly modalRef = inject(ModalRef<ModalDemoResult>);
}

@Component({
  selector: 'app-modal-demo-launcher',
  standalone: true,
  imports: [Button],
  template: `
    <div class="grid gap-3">
      <app-button (pressed)="open()">Abrir modal</app-button>

      @if (result()) {
        <p class="m-0 text-sm" style="color: var(--ui-muted-fg)">Resultado: {{ result() }}</p>
      }
    </div>
  `,
})
class ModalDemoLauncher {
  @Input() title = 'Editar tarea';
  @Input() description = 'Actualiza los datos principales.';
  @Input() size: ModalSize = 'md';
  @Input() appearance: ModalAppearance = 'default';
  @Input() closeOnBackdrop = true;
  @Input() closeOnEscape = true;
  @Input() message = '';

  protected readonly result = signal('');
  private readonly modal = inject(ModalController);

  protected open(): void {
    const ref = this.modal.open<ModalDemoContent, ModalDemoData, ModalDemoResult>(ModalDemoContent, {
      title: this.title,
      description: this.description,
      size: this.size,
      appearance: this.appearance,
      closeOnBackdrop: this.closeOnBackdrop,
      closeOnEscape: this.closeOnEscape,
      data: { message: this.message },
    });

    ref.closed.subscribe((result) => {
      this.result.set(result ? JSON.stringify(result) : 'cerrado sin resultado');
    });
  }
}

type ModalStoryArgs = {
  title: string;
  description: string;
  size: ModalSize;
  appearance: ModalAppearance;
  closeOnBackdrop: boolean;
  closeOnEscape: boolean;
  message: string;
};

const meta: Meta<ModalStoryArgs> = {
  title: 'Shared UI/ModalController',
  component: ModalDemoLauncher,
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
  },
  args: {
    title: 'Editar tarea',
    description: 'Actualiza los datos principales.',
    size: 'md',
    appearance: 'default',
    closeOnBackdrop: true,
    closeOnEscape: true,
    message: '',
  },
};

export default meta;

type Story = StoryObj<ModalStoryArgs>;

export const Default: Story = {};
export const WithData: Story = {
  args: {
    message: 'Data recibida desde MODAL_DATA para el componente dinamico.',
  },
};
export const BackdropDisabled: Story = {
  args: {
    closeOnBackdrop: false,
    description: 'El click exterior no cierra este modal.',
  },
};
export const EscapeDisabled: Story = {
  args: {
    closeOnEscape: false,
    description: 'Escape no cierra este modal.',
  },
};
export const Result: Story = {
  args: {
    message: 'Pulsa Guardar para emitir { saved: true }.',
  },
};
export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="flex flex-wrap gap-3">
        <app-modal-demo-launcher title="Modal pequeno" size="sm" />
        <app-modal-demo-launcher title="Modal mediano" size="md" />
        <app-modal-demo-launcher title="Modal grande" size="lg" />
      </div>
    `,
    imports: [ModalDemoLauncher],
  }),
};
