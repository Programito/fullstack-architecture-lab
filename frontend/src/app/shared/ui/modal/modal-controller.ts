import { Injectable, Injector } from '@angular/core';
import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal, type ComponentType } from '@angular/cdk/portal';
import { filter } from 'rxjs';
import { ModalContainer } from './modal-container';
import { ModalRef } from './modal-ref';
import { MODAL_DATA } from './modal.tokens';
import type { ModalConfig } from './modal.types';

@Injectable({ providedIn: 'root' })
export class ModalController {
  constructor(
    private readonly overlay: Overlay,
    private readonly injector: Injector,
  ) {}

  open<TComponent, TData = unknown, TResult = unknown>(
    component: ComponentType<TComponent>,
    config: ModalConfig<TData> = {},
  ): ModalRef<TResult> {
    const modalRef = new ModalRef<TResult>();
    const overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      panelClass: 'modal-overlay-pane',
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      scrollStrategy: this.overlay.scrollStrategies.block(),
    });

    modalRef.setCloseHandler(() => overlayRef.dispose());

    const containerRef = overlayRef.attach(new ComponentPortal(ModalContainer));
    const contentPortal = new ComponentPortal(
      component,
      null,
      Injector.create({
        parent: this.injector,
        providers: [
          { provide: ModalRef, useValue: modalRef },
          { provide: MODAL_DATA, useValue: config.data },
        ],
      }),
    );

    containerRef.setInput('title', config.title ?? '');
    containerRef.setInput('description', config.description ?? '');
    containerRef.setInput('size', config.size ?? 'md');
    containerRef.setInput('appearance', config.appearance ?? 'default');
    containerRef.setInput('closeAriaLabel', config.closeAriaLabel ?? 'Cerrar modal');
    containerRef.setInput('contentPortal', contentPortal);
    containerRef.changeDetectorRef.detectChanges();

    containerRef.instance.closed.subscribe(() => modalRef.close());

    if (config.closeOnBackdrop ?? true) {
      overlayRef.backdropClick().subscribe(() => modalRef.close());
    }

    if (config.closeOnEscape ?? true) {
      overlayRef
        .keydownEvents()
        .pipe(filter((event) => event.key === 'Escape'))
        .subscribe((event) => {
          event.preventDefault();
          modalRef.close();
        });
    }

    return modalRef;
  }
}
