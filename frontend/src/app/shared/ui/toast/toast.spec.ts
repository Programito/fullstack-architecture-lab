import { TestBed } from '@angular/core/testing';
import { fireEvent, render, screen } from '@testing-library/angular';
import { ToastService, ToastViewport } from './toast';

describe('ToastService', () => {
  afterEach(() => {
    TestBed.inject(ToastService).clear();
    vi.useRealTimers();
  });

  it('adds toasts, generates ids, and applies defaults', () => {
    const service = TestBed.inject(ToastService);

    const firstId = service.show({ title: 'Guardado' });
    const secondId = service.success({ title: 'Publicado', description: 'Ya es visible.' });

    expect(firstId).not.toBe(secondId);
    expect(service.toasts()).toHaveLength(2);
    expect(service.toasts()[0]).toMatchObject({
      id: secondId,
      title: 'Publicado',
      description: 'Ya es visible.',
      variant: 'success',
      duration: 5000,
      dismissible: true,
    });
    expect(service.toasts()[1]).toMatchObject({
      id: firstId,
      title: 'Guardado',
      description: '',
      variant: 'neutral',
    });
  });

  it('dismisses one toast and clears all toasts', () => {
    const service = TestBed.inject(ToastService);
    const firstId = service.show({ title: 'Uno', duration: 0 });

    service.show({ title: 'Dos', duration: 0 });
    service.dismiss(firstId);

    expect(service.toasts().map((toast) => toast.title)).toEqual(['Dos']);

    service.clear();

    expect(service.toasts()).toEqual([]);
  });

  it('auto-dismisses after duration and keeps duration 0 persistent', () => {
    vi.useFakeTimers();

    const service = TestBed.inject(ToastService);

    service.show({ title: 'Temporal', duration: 1000 });
    service.show({ title: 'Persistente', duration: 0 });

    vi.advanceTimersByTime(1000);

    expect(service.toasts().map((toast) => toast.title)).toEqual(['Persistente']);
  });
});

describe('ToastViewport', () => {
  afterEach(() => {
    TestBed.inject(ToastService).clear();
    vi.useRealTimers();
  });

  it('renders title, description, variant, position, and appearance classes', async () => {
    const { container, fixture } = await render('<app-toast-viewport position="bottom-center" appearance="minimal" />', {
      imports: [ToastViewport],
    });
    const service = TestBed.inject(ToastService);

    service.violet({ title: 'Invitacion enviada', description: 'El equipo recibira un email.', duration: 0 });
    fixture.detectChanges();

    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('Invitacion enviada')).toBeTruthy();
    expect(screen.getByText('El equipo recibira un email.')).toBeTruthy();
    expect(container.querySelector('.toast-viewport')?.className).toContain('toast-viewport--bottom-center');
    expect(container.querySelector('.toast-viewport')?.className).toContain('toast-viewport--minimal');
    expect(container.querySelector('.toast')?.className).toContain('toast--violet');
    expect(container.querySelector('.toast')?.className).toContain('toast--minimal');
  });

  it('dismisses a toast from the close button', async () => {
    const { fixture } = await render('<app-toast-viewport />', {
      imports: [ToastViewport],
    });
    const service = TestBed.inject(ToastService);

    service.show({ title: 'Cerrable', duration: 0 });
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar notificacion' }));
    fixture.detectChanges();

    expect(screen.queryByText('Cerrable')).toBeNull();
  });

  it('uses alert and assertive live region for danger toasts', async () => {
    const { fixture } = await render('<app-toast-viewport />', {
      imports: [ToastViewport],
    });
    const service = TestBed.inject(ToastService);

    service.danger({ title: 'Error critico', duration: 0 });
    fixture.detectChanges();

    const toast = screen.getByRole('alert');

    expect(toast.getAttribute('aria-live')).toBe('assertive');
  });

  it('limits visible toasts', async () => {
    const { fixture } = await render('<app-toast-viewport [limit]="4" />', {
      imports: [ToastViewport],
    });
    const service = TestBed.inject(ToastService);

    ['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco'].forEach((title) => {
      service.neutral({ title, duration: 0 });
    });
    fixture.detectChanges();

    expect(screen.getAllByRole('status')).toHaveLength(4);
    expect(screen.getByText('Cinco')).toBeTruthy();
    expect(screen.queryByText('Uno')).toBeNull();
  });
});
