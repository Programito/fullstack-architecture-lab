import { OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fireEvent, screen } from '@testing-library/angular';
import { MODAL_DATA, ModalController, ModalRef } from './modal';

type TestModalData = {
  label: string;
};

type TestModalResult = {
  saved: boolean;
};

@Component({
  standalone: true,
  template: `
    <p>Contenido dinamico: {{ data.label }}</p>
    <button type="button" (click)="modalRef.close({ saved: true })">Guardar</button>
  `,
})
class TestModalContent {
  protected readonly data = inject(MODAL_DATA) as TestModalData;
  protected readonly modalRef = inject(ModalRef<TestModalResult>);
}

describe('ModalController', () => {
  let modal: ModalController;
  let overlayContainer: OverlayContainer;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OverlayModule],
    });

    modal = TestBed.inject(ModalController);
    overlayContainer = TestBed.inject(OverlayContainer);
  });

  afterEach(() => {
    overlayContainer.ngOnDestroy();
  });

  it('opens a dynamic component', () => {
    modal.open(TestModalContent, {
      title: 'Editar tarea',
      data: { label: 'Tarea 1' },
    });

    expect(screen.getByRole('dialog', { name: 'Editar tarea' })).toBeTruthy();
    expect(screen.getByText('Contenido dinamico: Tarea 1')).toBeTruthy();
  });

  it('injects MODAL_DATA into the dynamic component', () => {
    modal.open(TestModalContent, {
      title: 'Detalle',
      data: { label: 'Dato inyectado' },
    });

    expect(screen.getByText('Contenido dinamico: Dato inyectado')).toBeTruthy();
  });

  it('closes with ModalRef.close', () => {
    const ref = modal.open(TestModalContent, {
      title: 'Cerrar desde ref',
      data: { label: 'Tarea 1' },
    });

    ref.close();

    expect(screen.queryByRole('dialog', { name: 'Cerrar desde ref' })).toBeNull();
  });

  it('emits a result once when closing', () => {
    const closed = vi.fn();
    const ref = modal.open<TestModalContent, TestModalData, TestModalResult>(TestModalContent, {
      title: 'Resultado',
      data: { label: 'Tarea 1' },
    });

    ref.closed.subscribe(closed);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    ref.close({ saved: false });

    expect(closed).toHaveBeenCalledTimes(1);
    expect(closed).toHaveBeenCalledWith({ saved: true });
  });

  it('closes with backdrop when allowed', () => {
    modal.open(TestModalContent, {
      title: 'Backdrop permitido',
      data: { label: 'Tarea 1' },
    });

    fireEvent.click(backdrop());

    expect(screen.queryByRole('dialog', { name: 'Backdrop permitido' })).toBeNull();
  });

  it('does not close with backdrop when disabled', () => {
    const ref = modal.open(TestModalContent, {
      title: 'Backdrop bloqueado',
      closeOnBackdrop: false,
      data: { label: 'Tarea 1' },
    });

    fireEvent.click(backdrop());

    expect(screen.getByRole('dialog', { name: 'Backdrop bloqueado' })).toBeTruthy();

    ref.close();
  });

  it('closes with Escape when allowed', () => {
    modal.open(TestModalContent, {
      title: 'Escape permitido',
      data: { label: 'Tarea 1' },
    });

    fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Escape permitido' })).toBeNull();
  });

  it('does not close with Escape when disabled', () => {
    const ref = modal.open(TestModalContent, {
      title: 'Escape bloqueado',
      closeOnEscape: false,
      data: { label: 'Tarea 1' },
    });

    fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(screen.getByRole('dialog', { name: 'Escape bloqueado' })).toBeTruthy();

    ref.close();
  });
});

const backdrop = (): HTMLElement => {
  const element = document.querySelector('.cdk-overlay-backdrop');

  if (!(element instanceof HTMLElement)) {
    throw new Error('Expected overlay backdrop');
  }

  return element;
};
