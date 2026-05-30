import { fireEvent, render, screen } from '@testing-library/angular';
import { DropdownMenu, type DropdownMenuItem } from './dropdown-menu';

const items: DropdownMenuItem[] = [
  { label: 'Editar', value: 'edit', icon: 'edit' },
  { label: 'Archivar', value: 'archive', disabled: true },
  { label: 'Eliminar', value: 'delete', danger: true },
];

describe('DropdownMenu', () => {
  it('opens and renders menu items', async () => {
    await render('<app-dropdown-menu label="Acciones" [items]="items" />', {
      imports: [DropdownMenu],
      componentProperties: { items },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Acciones' }));

    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /Editar/i })).toBeTruthy();
  });

  it('emits the selected item value', async () => {
    const selected = vi.fn();

    await render('<app-dropdown-menu label="Acciones" [items]="items" (selected)="selected($event)" />', {
      imports: [DropdownMenu],
      componentProperties: { items, selected },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Acciones' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Editar/i }));

    expect(selected).toHaveBeenCalledWith('edit');
  });

  it('selects an item with keyboard', async () => {
    const selected = vi.fn();

    await render('<app-dropdown-menu label="Acciones" [items]="items" (selected)="selected($event)" />', {
      imports: [DropdownMenu],
      componentProperties: { items, selected },
    });

    const trigger = screen.getByRole('button', { name: 'Acciones' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' });

    expect(selected).toHaveBeenCalledWith('edit');
  });

  it('does not select disabled items', async () => {
    const selected = vi.fn();

    await render('<app-dropdown-menu label="Acciones" [items]="items" (selected)="selected($event)" />', {
      imports: [DropdownMenu],
      componentProperties: { items, selected },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Acciones' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Archivar/i }));

    expect(selected).not.toHaveBeenCalled();
  });

  it('sets trigger aria attributes', async () => {
    await render('<app-dropdown-menu label="Acciones" [items]="items" />', {
      imports: [DropdownMenu],
      componentProperties: { items },
    });

    const trigger = screen.getByRole('button', { name: 'Acciones' });

    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});
