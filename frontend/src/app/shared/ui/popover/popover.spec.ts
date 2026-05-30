import { fireEvent, render, screen, waitFor } from '@testing-library/angular';
import { Popover } from './popover';

describe('Popover', () => {
  it('opens and emits openChange from the trigger', async () => {
    const openChange = vi.fn();

    await render(
      `
        <app-popover ariaLabel="Opciones" (openChange)="openChange($event)">
          <span popoverTrigger>Opciones</span>
          <p popoverPanel>Contenido del panel</p>
        </app-popover>
      `,
      {
        imports: [Popover],
        componentProperties: { openChange },
      },
    );

    const trigger = screen.getByRole('button', { name: 'Opciones' });
    fireEvent.click(trigger);

    expect(openChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('dialog', { name: 'Opciones' })).toBeTruthy();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes with Escape', async () => {
    const openChange = vi.fn();

    await render(
      `
        <app-popover ariaLabel="Opciones" [open]="true" (openChange)="openChange($event)">
          <span popoverTrigger>Opciones</span>
          <p popoverPanel>Contenido del panel</p>
        </app-popover>
      `,
      {
        imports: [Popover],
        componentProperties: { openChange },
      },
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(openChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Opciones' })).toBeNull());
  });

  it('closes on outside pointer down', async () => {
    const openChange = vi.fn();

    await render(
      `
        <button>Fuera</button>
        <app-popover ariaLabel="Opciones" [open]="true" (openChange)="openChange($event)">
          <span popoverTrigger>Opciones</span>
          <p popoverPanel>Contenido del panel</p>
        </app-popover>
      `,
      {
        imports: [Popover],
        componentProperties: { openChange },
      },
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Fuera' }));

    expect(openChange).toHaveBeenCalledWith(false);
  });

  it('does not open when disabled', async () => {
    const openChange = vi.fn();

    await render(
      `
        <app-popover disabled (openChange)="openChange($event)">
          <span popoverTrigger>Opciones</span>
          <p popoverPanel>Contenido del panel</p>
        </app-popover>
      `,
      {
        imports: [Popover],
        componentProperties: { openChange },
      },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Opciones' }));

    expect(openChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('applies manual placement class', async () => {
    await render(
      `
        <app-popover [open]="true" placement="right">
          <span popoverTrigger>Opciones</span>
          <p popoverPanel>Contenido del panel</p>
        </app-popover>
      `,
      {
        imports: [Popover],
      },
    );

    expect(screen.getByRole('dialog').className).toContain('popover__panel--right');
  });

  it('applies minimal appearance classes', async () => {
    await render(
      `
        <app-popover [open]="true" appearance="minimal">
          <span popoverTrigger>Opciones</span>
          <p popoverPanel>Contenido del panel</p>
        </app-popover>
      `,
      {
        imports: [Popover],
      },
    );

    expect(screen.getByRole('button', { name: 'Opciones' }).className).toContain('popover__trigger--minimal');
    expect(screen.getByRole('dialog').className).toContain('popover__panel--minimal');
  });
});
