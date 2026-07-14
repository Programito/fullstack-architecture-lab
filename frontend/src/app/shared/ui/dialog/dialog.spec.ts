import { fireEvent, render, screen, waitFor } from '@testing-library/angular';
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

  it('only closes the topmost dialog on Escape', async () => {
    const drawerClosed = vi.fn();
    const confirmationClosed = vi.fn();

    await render(
      `
        <app-dialog [open]="drawerOpen" title="Crear reserva" panelVariant="drawer" (closed)="drawerOpen = false; drawerClosed()">
          Contenido del cajon
        </app-dialog>
        <app-dialog [open]="confirmationOpen" title="Confirmar cancelacion" (closed)="confirmationOpen = false; confirmationClosed()">
          Confirmacion
        </app-dialog>
      `,
      {
        imports: [Dialog],
        componentProperties: { drawerOpen: true, confirmationOpen: true, drawerClosed, confirmationClosed },
      },
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(confirmationClosed).toHaveBeenCalledTimes(1);
    expect(drawerClosed).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Confirmar cancelacion' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Crear reserva' })).toBeTruthy();
  });

  it('does not let Escape close an underlying dialog when the topmost dialog disables Escape', async () => {
    const drawerClosed = vi.fn();
    const confirmationClosed = vi.fn();

    await render(
      `
        <app-dialog [open]="drawerOpen" title="Crear reserva" panelVariant="drawer" (closed)="drawerOpen = false; drawerClosed()">
          Contenido del cajon
        </app-dialog>
        <app-dialog [open]="confirmationOpen" title="Advertencia de capacidad" [closeOnEscape]="false" (closed)="confirmationOpen = false; confirmationClosed()">
          Confirmacion
        </app-dialog>
      `,
      {
        imports: [Dialog],
        componentProperties: { drawerOpen: true, confirmationOpen: true, drawerClosed, confirmationClosed },
      },
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(confirmationClosed).not.toHaveBeenCalled();
    expect(drawerClosed).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Advertencia de capacidad' })).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Crear reserva' })).toBeTruthy();
  });

  it('supports large size and minimal appearance', async () => {
    await render('<app-dialog open title="Detalle" size="lg" appearance="minimal">Contenido</app-dialog>', {
      imports: [Dialog],
    });

    const dialog = screen.getByRole('dialog', { name: 'Detalle' });
    expect(dialog.className).toContain('dialog__panel--lg');
    expect(dialog.className).toContain('dialog__panel--minimal');
  });

  it('applies the typed drawer variant to the dialog shell and panel', async () => {
    await render('<app-dialog open title="Reserva" panelVariant="drawer">Contenido</app-dialog>', {
      imports: [Dialog],
    });

    const dialog = screen.getByRole('dialog', { name: 'Reserva' });
    expect(dialog.getAttribute('data-variant')).toBe('drawer');
    expect(dialog.className).toContain('dialog__panel--drawer');
    expect(dialog.closest('.dialog')?.classList.contains('dialog--drawer')).toBe(true);
  });

  it('moves focus into the dialog on open and restores the opener on close', async () => {
    await render(
      `
        <button type="button" (click)="open = true">Abrir dialogo</button>
        <app-dialog [open]="open" title="Confirmar" (closed)="open = false">
          <button type="button">Accion interior</button>
        </app-dialog>
      `,
      {
        imports: [Dialog],
        componentProperties: { open: false },
      },
    );
    const opener = screen.getByRole('button', { name: 'Abrir dialogo' });
    opener.focus();

    fireEvent.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Confirmar' });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar dialogo' }));
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it('traps forward and reverse tab navigation inside the open dialog', async () => {
    await render(
      `
        <app-dialog open title="Confirmar">
          <button type="button">Primera accion</button>
          <button type="button">Ultima accion</button>
        </app-dialog>
      `,
      { imports: [Dialog] },
    );
    const closeButton = screen.getByRole('button', { name: 'Cerrar dialogo' });
    const lastButton = screen.getByRole('button', { name: 'Ultima accion' });

    lastButton.focus();
    fireEvent.keyDown(lastButton, { key: 'Tab' });
    expect(document.activeElement).toBe(closeButton);

    closeButton.focus();
    fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastButton);
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
