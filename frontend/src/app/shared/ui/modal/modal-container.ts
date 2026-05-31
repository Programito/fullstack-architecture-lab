import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CdkPortalOutlet, type Portal } from '@angular/cdk/portal';
import { Component, computed, input, output } from '@angular/core';
import type { ModalAppearance, ModalSize } from './modal.types';

let nextModalId = 0;

@Component({
  selector: 'app-modal-container',
  imports: [CdkPortalOutlet, CdkTrapFocus],
  templateUrl: './modal-container.html',
  styleUrl: './modal-container.css',
})
export class ModalContainer {
  readonly title = input('');
  readonly description = input('');
  readonly size = input<ModalSize>('md');
  readonly appearance = input<ModalAppearance>('default');
  readonly closeAriaLabel = input('Cerrar modal');
  readonly contentPortal = input<Portal<unknown> | null>(null);

  readonly closed = output<void>();

  private readonly id = nextModalId++;

  protected readonly titleId = `modal-title-${this.id}`;
  protected readonly descriptionId = `modal-description-${this.id}`;
  protected readonly classes = computed(() =>
    ['modal__panel', `modal__panel--${this.size()}`, `modal__panel--${this.appearance()}`].join(' '),
  );
  protected readonly labelledBy = computed(() => (this.title() ? this.titleId : null));
  protected readonly describedBy = computed(() => (this.description() ? this.descriptionId : null));

  protected close(): void {
    this.closed.emit();
  }
}
