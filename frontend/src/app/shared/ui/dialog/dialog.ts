import { booleanAttribute, Component, HostListener, computed, input, output } from '@angular/core';
import { Button, type ButtonFill, type ButtonVariant } from '../button/button';

export type DialogSize = 'sm' | 'md' | 'lg';
export type DialogAppearance = 'default' | 'minimal';

let nextDialogId = 0;

@Component({
  selector: 'app-dialog',
  imports: [Button],
  templateUrl: './dialog.html',
  styleUrl: './dialog.css',
})
export class Dialog {
  readonly open = input(false, { transform: booleanAttribute });
  readonly title = input('');
  readonly description = input('');
  readonly size = input<DialogSize>('md');
  readonly appearance = input<DialogAppearance>('default');
  readonly closeOnBackdrop = input(true, { transform: booleanAttribute });
  readonly closeOnEscape = input(true, { transform: booleanAttribute });
  readonly closeAriaLabel = input('Cerrar dialogo');
  readonly showActions = input(false, { transform: booleanAttribute });
  readonly showCancel = input(true, { transform: booleanAttribute });
  readonly cancelLabel = input('Cancelar');
  readonly cancelVariant = input<ButtonVariant>('neutral');
  readonly cancelFill = input<ButtonFill>('clear');
  readonly footerSummary = input('');
  readonly confirmLabel = input('Guardar');
  readonly confirmVariant = input<ButtonVariant>('primary');
  readonly confirmFill = input<ButtonFill>('solid');
  readonly confirmDisabled = input(false, { transform: booleanAttribute });
  readonly confirmLoading = input(false, { transform: booleanAttribute });

  readonly closed = output<void>();
  readonly cancelled = output<void>();
  readonly confirmed = output<void>();

  private readonly id = nextDialogId++;

  protected readonly titleId = `dialog-title-${this.id}`;
  protected readonly descriptionId = `dialog-description-${this.id}`;
  protected readonly classes = computed(() =>
    ['dialog__panel', `dialog__panel--${this.size()}`, `dialog__panel--${this.appearance()}`].join(' '),
  );
  protected readonly labelledBy = computed(() => (this.title() ? this.titleId : null));
  protected readonly describedBy = computed(() => (this.description() ? this.descriptionId : null));

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (this.open() && this.closeOnEscape()) {
      this.close();
    }
  }

  protected handleBackdropClick(): void {
    if (this.closeOnBackdrop()) {
      this.close();
    }
  }

  protected close(): void {
    this.closed.emit();
  }

  protected cancel(): void {
    this.cancelled.emit();
    this.close();
  }

  protected confirm(): void {
    if (!this.confirmDisabled() && !this.confirmLoading()) {
      this.confirmed.emit();
    }
  }
}
