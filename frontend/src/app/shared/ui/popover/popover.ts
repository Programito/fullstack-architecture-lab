import {
  booleanAttribute,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  input,
  numberAttribute,
  output,
  signal,
} from '@angular/core';

export type PopoverPlacement = 'top' | 'bottom' | 'left' | 'right';
export type PopoverPosition = 'auto' | PopoverPlacement;
export type PopoverAppearance = 'default' | 'minimal';

const VIEWPORT_MARGIN = 8;
let nextPopoverId = 0;

@Component({
  selector: 'app-popover',
  templateUrl: './popover.html',
  styleUrl: './popover.css',
})
export class Popover {
  readonly open = input(false, { transform: booleanAttribute });
  readonly appearance = input<PopoverAppearance>('default');
  readonly placement = input<PopoverPosition>('auto');
  readonly offset = input(8, { transform: normalizeOffset });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly closeOnEscape = input(true, { transform: booleanAttribute });
  readonly closeOnOutsideClick = input(true, { transform: booleanAttribute });
  readonly ariaLabel = input('Popover');

  readonly openChange = output<boolean>();

  @ViewChild('trigger', { read: ElementRef }) private triggerRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('panel', { read: ElementRef }) private panelRef?: ElementRef<HTMLElement>;

  private readonly id = nextPopoverId++;
  protected readonly panelId = `popover-${this.id}-panel`;
  protected readonly isOpen = signal(false);
  protected readonly activePlacement = signal<PopoverPlacement>('bottom');
  protected readonly panelLeft = signal(0);
  protected readonly panelTop = signal(0);

  protected readonly triggerClasses = computed(() => ['popover__trigger', `popover__trigger--${this.appearance()}`].join(' '));

  protected readonly panelClasses = computed(() =>
    ['popover__panel', `popover__panel--${this.activePlacement()}`, `popover__panel--${this.appearance()}`].join(' '),
  );

  constructor(private readonly host: ElementRef<HTMLElement>) {
    effect(() => {
      this.isOpen.set(this.open());
      if (this.open()) {
        const requestedPlacement = this.placement();
        if (requestedPlacement !== 'auto') {
          this.activePlacement.set(requestedPlacement);
        }

        queueMicrotask(() => this.updatePosition());
      }
    });
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (this.isOpen() && this.closeOnEscape()) {
      this.close();
    }
  }

  @HostListener('document:pointerdown', ['$event'])
  protected handleDocumentPointerDown(event: PointerEvent): void {
    if (!this.isOpen() || !this.closeOnOutsideClick()) {
      return;
    }

    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  protected updatePosition(): void {
    if (!this.isOpen()) {
      return;
    }

    const trigger = this.triggerRef?.nativeElement;
    const panel = this.panelRef?.nativeElement;

    if (!trigger || !panel) {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const placement = this.resolvePlacement(triggerRect, panelRect);
    const coordinates = this.calculateCoordinates(triggerRect, panelRect, placement);

    this.activePlacement.set(placement);
    this.panelLeft.set(coordinates.left);
    this.panelTop.set(coordinates.top);
  }

  protected toggle(): void {
    if (this.disabled()) {
      return;
    }

    this.setOpen(!this.isOpen());
  }

  protected close(): void {
    this.setOpen(false);
  }

  private setOpen(nextOpen: boolean): void {
    if (this.isOpen() === nextOpen) {
      return;
    }

    this.isOpen.set(nextOpen);
    this.openChange.emit(nextOpen);

    if (nextOpen) {
      const requestedPlacement = this.placement();
      if (requestedPlacement !== 'auto') {
        this.activePlacement.set(requestedPlacement);
      }

      queueMicrotask(() => this.updatePosition());
    }
  }

  private resolvePlacement(triggerRect: DOMRect, panelRect: DOMRect): PopoverPlacement {
    const requestedPlacement = this.placement();

    if (requestedPlacement !== 'auto') {
      return requestedPlacement;
    }

    const placements: PopoverPlacement[] = ['bottom', 'top', 'right', 'left'];
    return placements.find((placement) => this.hasRoom(placement, triggerRect, panelRect)) ?? 'bottom';
  }

  private hasRoom(placement: PopoverPlacement, triggerRect: DOMRect, panelRect: DOMRect): boolean {
    const offset = this.offset();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    switch (placement) {
      case 'top':
        return triggerRect.top - panelRect.height - offset >= VIEWPORT_MARGIN;
      case 'bottom':
        return triggerRect.bottom + panelRect.height + offset <= viewportHeight - VIEWPORT_MARGIN;
      case 'left':
        return triggerRect.left - panelRect.width - offset >= VIEWPORT_MARGIN;
      case 'right':
        return triggerRect.right + panelRect.width + offset <= viewportWidth - VIEWPORT_MARGIN;
    }
  }

  private calculateCoordinates(
    triggerRect: DOMRect,
    panelRect: DOMRect,
    placement: PopoverPlacement,
  ): { left: number; top: number } {
    const offset = this.offset();
    let left = 0;
    let top = 0;

    switch (placement) {
      case 'top':
        left = triggerRect.left + triggerRect.width / 2 - panelRect.width / 2;
        top = triggerRect.top - panelRect.height - offset;
        break;
      case 'bottom':
        left = triggerRect.left + triggerRect.width / 2 - panelRect.width / 2;
        top = triggerRect.bottom + offset;
        break;
      case 'left':
        left = triggerRect.left - panelRect.width - offset;
        top = triggerRect.top + triggerRect.height / 2 - panelRect.height / 2;
        break;
      case 'right':
        left = triggerRect.right + offset;
        top = triggerRect.top + triggerRect.height / 2 - panelRect.height / 2;
        break;
    }

    return {
      left: clamp(left, VIEWPORT_MARGIN, window.innerWidth - panelRect.width - VIEWPORT_MARGIN),
      top: clamp(top, VIEWPORT_MARGIN, window.innerHeight - panelRect.height - VIEWPORT_MARGIN),
    };
  }
}

const normalizeOffset = (value: unknown): number => {
  const offset = numberAttribute(value);
  return Number.isFinite(offset) && offset >= 0 ? offset : 8;
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
