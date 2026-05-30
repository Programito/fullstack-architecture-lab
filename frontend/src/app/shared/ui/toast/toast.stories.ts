import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { ToastService, ToastViewport, type ToastAppearance, type ToastPosition, type ToastVariant } from './toast';

type ToastStoryArgs = {
  position: ToastPosition;
  appearance: ToastAppearance;
  limit: number;
};

const triggerClasses =
  'rounded-md border px-4 py-2 text-sm font-medium shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300';
const triggerStyles = 'border-color: var(--ui-border); background: var(--ui-bg); color: var(--ui-fg);';

@Component({
  selector: 'app-toast-story-host',
  imports: [ToastViewport],
  template: `
    <div class="grid gap-4">
      <div class="flex flex-wrap gap-3">
        <button class="${triggerClasses}" style="${triggerStyles}" type="button" (click)="showSuccess()">
          Mostrar toast
        </button>
        <button class="${triggerClasses}" style="${triggerStyles}" type="button" (click)="showDanger()">
          Error
        </button>
        <button class="${triggerClasses}" style="${triggerStyles}" type="button" (click)="toast.clear()">
          Limpiar
        </button>
      </div>

      <p class="m-0 max-w-xl text-sm" style="color: var(--ui-muted-fg)">
        Usa los controles de Storybook para cambiar la posicion del viewport.
      </p>
    </div>

    <app-toast-viewport [position]="position" [appearance]="appearance" [limit]="limit" />
  `,
})
class ToastStoryHost implements OnInit, OnDestroy {
  @Input() position: ToastPosition = 'top-right';
  @Input() appearance: ToastAppearance = 'default';
  @Input() limit = 4;

  protected readonly toast = inject(ToastService);

  ngOnInit(): void {
    this.toast.clear();
  }

  ngOnDestroy(): void {
    this.toast.clear();
  }

  protected showSuccess(): void {
    this.toast.success({
      title: 'Cambios guardados',
      description: 'La configuracion se actualizo correctamente.',
    });
  }

  protected showDanger(): void {
    this.toast.danger({
      title: 'No se pudo guardar',
      description: 'Revisa los datos e intentalo de nuevo.',
    });
  }
}

@Component({
  selector: 'app-toast-positions-story',
  imports: [ToastViewport],
  template: `
    <div class="grid max-w-2xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
      @for (position of positions; track position) {
        <button class="${triggerClasses}" style="${triggerStyles}" type="button" (click)="showAt(position)">
          {{ position }}
        </button>
      }
    </div>

    <app-toast-viewport [position]="position" />
  `,
})
class ToastPositionsStory implements OnInit, OnDestroy {
  protected position: ToastPosition = 'top-right';
  protected readonly positions: ToastPosition[] = [
    'top-left',
    'top-center',
    'top-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
  ];

  private readonly toast = inject(ToastService);

  ngOnInit(): void {
    this.toast.clear();
  }

  ngOnDestroy(): void {
    this.toast.clear();
  }

  protected showAt(position: ToastPosition): void {
    this.position = position;
    this.toast.primary({
      title: `Posicion ${position}`,
      description: 'El viewport decide donde se apila el toast.',
    });
  }
}

@Component({
  selector: 'app-toast-variants-story',
  imports: [ToastViewport],
  template: `
    <div class="flex flex-wrap gap-3">
      @for (variant of variants; track variant) {
        <button class="${triggerClasses}" style="${triggerStyles}" type="button" (click)="showVariant(variant)">
          {{ variant }}
        </button>
      }
    </div>

    <app-toast-viewport position="top-right" />
  `,
})
class ToastVariantsStory implements OnInit, OnDestroy {
  protected readonly variants: ToastVariant[] = ['primary', 'neutral', 'success', 'warning', 'danger', 'violet'];
  private readonly toast = inject(ToastService);

  ngOnInit(): void {
    this.toast.clear();
  }

  ngOnDestroy(): void {
    this.toast.clear();
  }

  protected showVariant(variant: ToastVariant): void {
    this.toast.show({
      title: `Toast ${variant}`,
      description: 'Variante semantica con color y live region adecuados.',
      variant,
    });
  }
}

@Component({
  selector: 'app-toast-multiple-story',
  imports: [ToastViewport],
  template: `
    <button class="${triggerClasses}" style="${triggerStyles}" type="button" (click)="showMany()">
      Mostrar varios
    </button>

    <app-toast-viewport position="bottom-right" [limit]="4" />
  `,
})
class ToastMultipleStory implements OnInit, OnDestroy {
  private readonly toast = inject(ToastService);

  ngOnInit(): void {
    this.toast.clear();
  }

  ngOnDestroy(): void {
    this.toast.clear();
  }

  protected showMany(): void {
    this.toast.clear();
    ['Importado', 'Sincronizado', 'Publicado', 'Archivado', 'Compartido'].forEach((title, index) => {
      this.toast.success({
        title,
        description: `Operacion ${index + 1} completada.`,
        duration: 0,
      });
    });
  }
}

@Component({
  selector: 'app-toast-custom-story',
  imports: [ToastViewport],
  template: `
    <button class="${triggerClasses}" style="${triggerStyles}" type="button" (click)="showDemo()">
      {{ buttonLabel }}
    </button>

    <app-toast-viewport position="top-right" />
  `,
})
class ToastCustomStory implements OnInit, OnDestroy {
  @Input() demo: 'dismissible' | 'auto' | 'long' = 'dismissible';

  private readonly toast = inject(ToastService);
  protected buttonLabel = 'Mostrar persistente';

  ngOnInit(): void {
    this.toast.clear();
    this.buttonLabel =
      {
        dismissible: 'Mostrar persistente',
        auto: 'Mostrar auto-dismiss',
        long: 'Mostrar texto largo',
      }[this.demo] ?? 'Mostrar persistente';
  }

  ngOnDestroy(): void {
    this.toast.clear();
  }

  protected showDemo(): void {
    if (this.demo === 'auto') {
      this.showAutoDismiss();
      return;
    }

    if (this.demo === 'long') {
      this.showLongText();
      return;
    }

    this.toast.primary({
      title: 'Revision pendiente',
      description: 'Este toast no se cierra solo porque su duracion es 0.',
      duration: 0,
    });
  }

  protected showAutoDismiss(): void {
    this.toast.success({
      title: 'Se cerrara pronto',
      description: 'Duracion configurada a 1500ms para la demo.',
      duration: 1500,
    });
  }

  protected showLongText(): void {
    this.toast.warning({
      title: 'Nombre de archivo demasiado largo para la sincronizacion automatica',
      description:
        'El contenido se ajusta dentro del ancho maximo del toast para evitar desbordes en pantallas pequenas.',
      duration: 0,
    });
  }
}

const meta: Meta<ToastStoryArgs> = {
  title: 'Shared UI/Toast',
  component: ToastStoryHost,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [ToastStoryHost, ToastPositionsStory, ToastVariantsStory, ToastMultipleStory, ToastCustomStory],
    }),
  ],
  argTypes: {
    position: {
      control: 'select',
      options: ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'],
    },
    limit: {
      control: { type: 'number', min: 1, max: 8 },
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
  },
  args: {
    position: 'top-right',
    appearance: 'default',
    limit: 4,
  },
};

export default meta;

type Story = StoryObj<ToastStoryArgs>;

export const Default: Story = {};

export const Positions: Story = {
  render: () => ({
    template: '<app-toast-positions-story />',
  }),
};

export const Variants: Story = {
  render: () => ({
    template: '<app-toast-variants-story />',
  }),
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
  },
};

export const Multiple: Story = {
  render: () => ({
    template: '<app-toast-multiple-story />',
  }),
};

export const Dismissible: Story = {
  render: () => ({
    template: '<app-toast-custom-story demo="dismissible" />',
  }),
};

export const AutoDismiss: Story = {
  render: () => ({
    template: '<app-toast-custom-story demo="auto" />',
  }),
};

export const LongText: Story = {
  render: () => ({
    template: '<app-toast-custom-story demo="long" />',
  }),
};
