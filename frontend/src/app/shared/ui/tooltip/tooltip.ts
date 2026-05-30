import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  ApplicationRef,
  Component,
  ComponentRef,
  Directive,
  ElementRef,
  EnvironmentInjector,
  HostListener,
  TemplateRef,
  booleanAttribute,
  computed,
  createComponent,
  inject,
  input,
  numberAttribute,
} from '@angular/core';

export type TooltipContent = string | TemplateRef<unknown> | null;
export type TooltipAppearance = 'default' | 'minimal';
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';
export type TooltipPosition = 'auto' | TooltipPlacement;

const VIEWPORT_MARGIN = 8;
let nextTooltipId = 0;

@Component({
  selector: 'app-tooltip-bubble',
  imports: [NgTemplateOutlet],
  template: `
    <div
      [id]="id()"
      [class]="classes()"
      role="tooltip"
      [style.left.px]="left()"
      [style.top.px]="top()"
    >
      @if (templateContent()) {
        <ng-container [ngTemplateOutlet]="templateContent()" [ngTemplateOutletContext]="templateContext()"></ng-container>
      } @else {
        {{ textContent() }}
      }
    </div>
  `,
  styleUrl: './tooltip.css',
})
class TooltipBubble {
  readonly id = input('');
  readonly content = input<TooltipContent>(null);
  readonly context = input<unknown>(null);
  readonly placement = input<TooltipPlacement>('top');
  readonly appearance = input<TooltipAppearance>('default');
  readonly left = input(0, { transform: numberAttribute });
  readonly top = input(0, { transform: numberAttribute });

  protected readonly classes = computed(() =>
    ['tooltip', `tooltip--${this.placement()}`, `tooltip--${this.appearance()}`].join(' '),
  );

  protected readonly templateContent = computed(() => {
    const content = this.content();
    return content instanceof TemplateRef ? content : null;
  });

  protected readonly templateContext = computed(() => {
    const context = this.context();
    return typeof context === 'object' && context !== null ? context : { $implicit: context };
  });

  protected readonly textContent = computed(() => {
    const content = this.content();
    return typeof content === 'string' ? content : '';
  });
}

@Directive({
  selector: '[appTooltip]',
})
export class Tooltip {
  readonly tooltip = input<TooltipContent>(null, { alias: 'appTooltip' });
  readonly position = input<TooltipPosition>('auto', { alias: 'tooltipPosition' });
  readonly disabled = input(false, { alias: 'tooltipDisabled', transform: booleanAttribute });
  readonly showDelay = input(120, { alias: 'tooltipShowDelay', transform: normalizeDelay });
  readonly hideDelay = input(80, { alias: 'tooltipHideDelay', transform: normalizeDelay });
  readonly offset = input(8, { alias: 'tooltipOffset', transform: normalizeOffset });
  readonly context = input<unknown>(null, { alias: 'tooltipContext' });
  readonly appearance = input<TooltipAppearance>('default', { alias: 'tooltipAppearance' });

  private readonly appRef = inject(ApplicationRef);
  private readonly document = inject(DOCUMENT);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly tooltipId = `tooltip-${nextTooltipId++}`;

  private componentRef: ComponentRef<TooltipBubble> | null = null;
  private describedByBeforeOpen: string | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly updatePositionListener = () => this.updatePosition();

  @HostListener('mouseenter')
  protected handleMouseEnter(): void {
    this.queueShow();
  }

  @HostListener('mouseleave')
  protected handleMouseLeave(): void {
    this.queueHide();
  }

  @HostListener('focusin')
  protected handleFocusIn(): void {
    this.queueShow();
  }

  @HostListener('focusout')
  protected handleFocusOut(): void {
    this.queueHide();
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    this.hide();
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.hide();
  }

  private queueShow(): void {
    if (this.disabled() || !this.hasContent()) {
      return;
    }

    this.clearTimer('hide');

    if (this.componentRef) {
      this.updatePosition();
      return;
    }

    this.clearTimer('show');
    this.showTimer = setTimeout(() => this.show(), this.showDelay());
  }

  private queueHide(): void {
    this.clearTimer('show');
    this.clearTimer('hide');
    this.hideTimer = setTimeout(() => this.hide(), this.hideDelay());
  }

  private show(): void {
    if (this.disabled() || !this.hasContent() || this.componentRef) {
      return;
    }

    this.componentRef = createComponent(TooltipBubble, {
      environmentInjector: this.environmentInjector,
    });
    this.appRef.attachView(this.componentRef.hostView);
    this.document.body.appendChild(this.componentRef.location.nativeElement);

    this.componentRef.setInput('id', this.tooltipId);
    this.componentRef.setInput('content', this.tooltip());
    this.componentRef.setInput('context', this.context());
    this.componentRef.setInput('appearance', this.appearance());
    this.componentRef.changeDetectorRef.detectChanges();
    this.updatePosition();
    this.applyDescribedBy();
    this.addPositionListeners();
  }

  private hide(): void {
    if (!this.componentRef) {
      return;
    }

    this.removePositionListeners();
    this.restoreDescribedBy();
    this.appRef.detachView(this.componentRef.hostView);
    this.componentRef.destroy();
    this.componentRef = null;
  }

  private updatePosition(): void {
    if (!this.componentRef) {
      return;
    }

    this.componentRef.setInput('content', this.tooltip());
    this.componentRef.setInput('context', this.context());
    this.componentRef.setInput('appearance', this.appearance());
    this.componentRef.changeDetectorRef.detectChanges();

    const bubble = this.componentRef.location.nativeElement.querySelector('.tooltip') as HTMLElement | null;

    if (!bubble) {
      return;
    }

    const triggerRect = this.elementRef.nativeElement.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const placement = this.resolvePlacement(triggerRect, bubbleRect);
    const coordinates = this.calculateCoordinates(triggerRect, bubbleRect, placement);

    this.componentRef.setInput('placement', placement);
    this.componentRef.setInput('left', coordinates.left);
    this.componentRef.setInput('top', coordinates.top);
    this.componentRef.changeDetectorRef.detectChanges();
  }

  private resolvePlacement(triggerRect: DOMRect, bubbleRect: DOMRect): TooltipPlacement {
    const requestedPosition = this.position();

    if (requestedPosition !== 'auto') {
      return requestedPosition;
    }

    const placements: TooltipPlacement[] = ['top', 'bottom', 'right', 'left'];

    return placements.find((placement) => this.hasRoom(placement, triggerRect, bubbleRect)) ?? 'top';
  }

  private hasRoom(placement: TooltipPlacement, triggerRect: DOMRect, bubbleRect: DOMRect): boolean {
    const offset = this.offset();
    const viewportWidth = this.document.defaultView?.innerWidth ?? 0;
    const viewportHeight = this.document.defaultView?.innerHeight ?? 0;

    switch (placement) {
      case 'top':
        return triggerRect.top - bubbleRect.height - offset >= VIEWPORT_MARGIN;
      case 'bottom':
        return triggerRect.bottom + bubbleRect.height + offset <= viewportHeight - VIEWPORT_MARGIN;
      case 'left':
        return triggerRect.left - bubbleRect.width - offset >= VIEWPORT_MARGIN;
      case 'right':
        return triggerRect.right + bubbleRect.width + offset <= viewportWidth - VIEWPORT_MARGIN;
    }
  }

  private calculateCoordinates(
    triggerRect: DOMRect,
    bubbleRect: DOMRect,
    placement: TooltipPlacement,
  ): { left: number; top: number } {
    const offset = this.offset();
    const viewportWidth = this.document.defaultView?.innerWidth ?? 0;
    const viewportHeight = this.document.defaultView?.innerHeight ?? 0;
    let left = 0;
    let top = 0;

    switch (placement) {
      case 'top':
        left = triggerRect.left + triggerRect.width / 2 - bubbleRect.width / 2;
        top = triggerRect.top - bubbleRect.height - offset;
        break;
      case 'bottom':
        left = triggerRect.left + triggerRect.width / 2 - bubbleRect.width / 2;
        top = triggerRect.bottom + offset;
        break;
      case 'left':
        left = triggerRect.left - bubbleRect.width - offset;
        top = triggerRect.top + triggerRect.height / 2 - bubbleRect.height / 2;
        break;
      case 'right':
        left = triggerRect.right + offset;
        top = triggerRect.top + triggerRect.height / 2 - bubbleRect.height / 2;
        break;
    }

    return {
      left: clamp(left, VIEWPORT_MARGIN, viewportWidth - bubbleRect.width - VIEWPORT_MARGIN),
      top: clamp(top, VIEWPORT_MARGIN, viewportHeight - bubbleRect.height - VIEWPORT_MARGIN),
    };
  }

  private applyDescribedBy(): void {
    const trigger = this.elementRef.nativeElement;
    this.describedByBeforeOpen = trigger.getAttribute('aria-describedby');
    const ids = new Set((this.describedByBeforeOpen ?? '').split(/\s+/).filter(Boolean));
    ids.add(this.tooltipId);
    trigger.setAttribute('aria-describedby', Array.from(ids).join(' '));
  }

  private restoreDescribedBy(): void {
    const trigger = this.elementRef.nativeElement;

    if (this.describedByBeforeOpen) {
      trigger.setAttribute('aria-describedby', this.describedByBeforeOpen);
    } else {
      trigger.removeAttribute('aria-describedby');
    }

    this.describedByBeforeOpen = null;
  }

  private addPositionListeners(): void {
    const view = this.document.defaultView;
    view?.addEventListener('resize', this.updatePositionListener);
    view?.addEventListener('scroll', this.updatePositionListener, true);
  }

  private removePositionListeners(): void {
    const view = this.document.defaultView;
    view?.removeEventListener('resize', this.updatePositionListener);
    view?.removeEventListener('scroll', this.updatePositionListener, true);
  }

  private hasContent(): boolean {
    const content = this.tooltip();
    return content instanceof TemplateRef || (typeof content === 'string' && content.trim().length > 0);
  }

  private clearTimers(): void {
    this.clearTimer('show');
    this.clearTimer('hide');
  }

  private clearTimer(type: 'show' | 'hide'): void {
    const timer = type === 'show' ? this.showTimer : this.hideTimer;

    if (timer) {
      clearTimeout(timer);
    }

    if (type === 'show') {
      this.showTimer = null;
    } else {
      this.hideTimer = null;
    }
  }
}

const normalizeDelay = (value: unknown): number => {
  const delay = numberAttribute(value);
  return Number.isFinite(delay) && delay >= 0 ? delay : 0;
};

const normalizeOffset = (value: unknown): number => {
  const offset = numberAttribute(value);
  return Number.isFinite(offset) && offset >= 0 ? offset : 8;
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
