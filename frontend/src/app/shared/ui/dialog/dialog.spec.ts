import { fireEvent, render, screen } from '@testing-library/angular';
import { Dialog } from './dialog';

describe('Dialog', () => {
  it('renders when open', async () => {
    await render('<app-dialog open title="Confirmar">Contenido</app-dialog>', {
      imports: [Dialog],
    });

    expect(screen.getByRole('dialog', { name: 'Confirmar' })).toBeTruthy();
    expect(screen.getByText('Contenido')).toBeTruthy();
  });

  it('does not render when closed', async () => {
    await render('<app-dialog title="Confirmar">Contenido</app-dialog>', {
      imports: [Dialog],
    });

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('emits closed from the close button', async () => {
    const closed = vi.fn();

    await render('<app-dialog open title="Confirmar" (closed)="closed()">Contenido</app-dialog>', {
      imports: [Dialog],
      componentProperties: { closed },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar dialogo' }));

    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('emits closed on Escape', async () => {
    const closed = vi.fn();

    await render('<app-dialog open title="Confirmar" (closed)="closed()">Contenido</app-dialog>', {
      imports: [Dialog],
      componentProperties: { closed },
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('supports large size and minimal appearance', async () => {
    await render('<app-dialog open title="Detalle" size="lg" appearance="minimal">Contenido</app-dialog>', {
      imports: [Dialog],
    });

    const dialog = screen.getByRole('dialog', { name: 'Detalle' });
    expect(dialog.className).toContain('dialog__panel--lg');
    expect(dialog.className).toContain('dialog__panel--minimal');
  });

  it('renders optional actions', async () => {
    await render('<app-dialog open showActions title="Confirmar" confirmVariant="danger">Contenido</app-dialog>', {
      imports: [Dialog],
    });

    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Guardar' }).className).toContain('bg-red-600');
  });

  it('keeps header and footer outside the scrollable body', async () => {
    await render(
      '<app-dialog open showActions title="Confirmar" footerSummary="3 productos añadidos · 18,00 €"><div style="height: 2000px">Contenido largo</div></app-dialog>',
      {
        imports: [Dialog],
      },
    );

    const dialog = screen.getByRole('dialog', { name: 'Confirmar' });
    const header = dialog.querySelector('.dialog__header');
    const body = dialog.querySelector('.dialog__body');
    const footer = dialog.querySelector('.dialog__footer');

    expect(header?.parentElement).toBe(dialog);
    expect(body?.parentElement).toBe(dialog);
    expect(footer?.parentElement).toBe(dialog);
    expect(body?.className).toContain('dialog__body');
    expect(screen.getByText('3 productos añadidos · 18,00 €')).toBeTruthy();
  });

  it('supports hiding cancel action', async () => {
    await render('<app-dialog open showActions title="Confirmar" [showCancel]="false">Contenido</app-dialog>', {
      imports: [Dialog],
    });

    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy();
  });

  it('emits confirmed from the confirm action', async () => {
    const confirmed = vi.fn();

    await render('<app-dialog open showActions title="Confirmar" (confirmed)="confirmed()">Contenido</app-dialog>', {
      imports: [Dialog],
      componentProperties: { confirmed },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(confirmed).toHaveBeenCalledTimes(1);
  });
});
