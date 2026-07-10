import { Directive, ElementRef, inject, output, type OnDestroy, type OnInit } from '@angular/core';

/**
 * Emite `nearEnd` cada vez que el elemento host entra en el viewport.
 * Pensado para centinelas de carga progresiva al final de una lista:
 *
 * ```html
 * @if (hasMore()) { <div appNearEnd (nearEnd)="showMore()" class="h-8"></div> }
 * ```
 *
 * Usa IntersectionObserver con un margen de 200px para pedir el siguiente
 * tramo un poco antes de que el usuario llegue al final. En entornos sin
 * IntersectionObserver (tests con jsdom antiguos) emite una vez al iniciar
 * para no dejar la lista truncada.
 */
@Directive({
  selector: '[appNearEnd]',
})
export class NearEndDirective implements OnInit, OnDestroy {
  readonly nearEnd = output<void>();

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      this.nearEnd.emit();
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.nearEnd.emit();
        }
      },
      { rootMargin: '200px' },
    );
    this.observer.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
