import { booleanAttribute, Component, DestroyRef, ElementRef, HostListener, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { Button, type ButtonFill, type ButtonVariant } from '../button/button';

export type DialogSize = 'sm' | 'md' | 'lg';
export type DialogAppearance = 'default' | 'minimal';
/** Controls the dialog's placement while retaining the shared modal behavior. */
export type DialogPanelVariant = 'default' | 'drawer';

let nextDialogId = 0;

@Component({
  selector: 'app-dialog',
  imports: [Button],
  templateUrl: './dialog.html',
  styleUrl: './dialog.css',
})
export class Dialog {
  private static readonly openDialogs = new Set<Dialog>();

  readonly open = input(false, { transform: booleanAttribute });
  readonly title = input('');
  readonly description = input('');
  readonly size = input<DialogSize>('md');
  readonly appearance = input<DialogAppearance>('default');
  readonly panelClass = input('');
  readonly panelVariant = input<DialogPanelVariant>('default');
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
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly stackLayer = signal(0);
  private previouslyFocusedElement: HTMLElement | null = null;
  private wasOpen = false;

  protected readonly titleId = `dialog-title-${this.id}`;
  protected readonly descriptionId = `dialog-description-${this.id}`;
  protected readonly dialogPanel = viewChild<ElementRef<HTMLElement>>('dialogPanel');
  protected readonly classes = computed(() =>
    [
      'dialog__panel',
      `dialog__panel--${this.size()}`,
      `dialog__panel--${this.appearance()}`,
      `dialog__panel--${this.panelVariant()}`,
      this.panelClass(),
    ]
      .filter(Boolean)
      .join(' '),
  );
  protected readonly labelledBy = computed(() => (this.title() ? this.titleId : null));
  protected readonly describedBy = computed(() => (this.description() ? this.descriptionId : null));
  protected readonly zIndex = computed(() => 50 + this.stackLayer());

  constructor() {
    effect(() => {
      const isOpen = this.open();
      if (isOpen === this.wasOpen) return;

      this.wasOpen = isOpen;
      if (isOpen) {
        this.registerInStack();
        this.previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        queueMicrotask(() => this.focusInitialElement());
        return;
      }

      this.unregisterFromStack();
      this.restoreFocus();
    });

    this.destroyRef.onDestroy(() => {
      this.unregisterFromStack();
      this.restoreFocus();
    });
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (Dialog.topmost() === this && this.closeOnEscape()) {
      this.close();
    }
  }

  protected handleBackdropClick(): void {
    if (this.closeOnBackdrop()) {
      this.close();
    }
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;

    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) {
      event.preventDefault();
      this.dialogPanel()?.nativeElement.focus();
      return;
    }

    const firstElement = focusableElements[0]!;
    const lastElement = focusableElements.at(-1)!;
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
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

  private focusInitialElement(): void {
    const dialogPanel = this.dialogPanel()?.nativeElement;
    if (!dialogPanel || !this.open()) return;

    const initialElement = this.getFocusableElements()[0];
    if (initialElement) {
      initialElement.focus();
      return;
    }

    dialogPanel.focus();
  }

  private getFocusableElements(): HTMLElement[] {
    const focusableElements = this.host.nativeElement.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) as NodeListOf<HTMLElement>;

    return Array.from(focusableElements).filter((element) => element.tabIndex >= 0 && !element.hasAttribute('hidden'));
  }

  private restoreFocus(): void {
    const previouslyFocusedElement = this.previouslyFocusedElement;
    this.previouslyFocusedElement = null;
    if (this.isFocusable(previouslyFocusedElement)) {
      previouslyFocusedElement.focus();
      return;
    }

    Dialog.topmost()?.focusInitialElement();
  }

  private isFocusable(element: HTMLElement | null): element is HTMLElement {
    return !!element
      && element.isConnected
      && element.tabIndex >= 0
      && !element.matches(':disabled, [hidden]');
  }

  private registerInStack(): void {
    Dialog.openDialogs.add(this);
    Dialog.updateStackLayers();
  }

  private unregisterFromStack(): void {
    if (Dialog.openDialogs.delete(this)) Dialog.updateStackLayers();
  }

  private static topmost(): Dialog | undefined {
    return Array.from(Dialog.openDialogs).at(-1);
  }

  private static updateStackLayers(): void {
    let layer = 0;
    for (const dialog of Dialog.openDialogs) {
      dialog.stackLayer.set(layer);
      layer += 10;
    }
  }
}
