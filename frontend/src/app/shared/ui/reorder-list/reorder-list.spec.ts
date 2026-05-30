import { fireEvent, render, screen } from '@testing-library/angular';
import { ReorderList, type ReorderListItem } from './reorder-list';

const items: ReorderListItem[] = [
  { id: 'one', label: 'Uno', description: 'Primer elemento', icon: 'looks_one' },
  { id: 'two', label: 'Dos', description: 'Segundo elemento', icon: 'looks_two' },
  { id: 'three', label: 'Tres', description: 'Tercer elemento', icon: 'looks_3' },
];

describe('ReorderList', () => {
  it('renders label, hint and items', async () => {
    await render('<app-reorder-list label="Orden" hint="Cambia el orden" [value]="items" />', {
      imports: [ReorderList],
      componentProperties: { items },
    });

    expect(screen.getByText('Orden')).toBeTruthy();
    expect(screen.getByText('Cambia el orden')).toBeTruthy();
    expect(screen.getByText('Uno')).toBeTruthy();
    expect(screen.getByText('Dos')).toBeTruthy();
  });

  it('moves an item up with controls', async () => {
    const valueChange = vi.fn();
    const reordered = vi.fn();

    await render('<app-reorder-list [value]="items" (valueChange)="valueChange($event)" (reordered)="reordered($event)" />', {
      imports: [ReorderList],
      componentProperties: { items, valueChange, reordered },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Subir Dos' }));

    expect(valueChange).toHaveBeenCalledWith([items[1], items[0], items[2]]);
    expect(reordered).toHaveBeenCalledWith({
      value: [items[1], items[0], items[2]],
      previousIndex: 1,
      currentIndex: 0,
      item: items[1],
    });
  });

  it('moves an item down with controls', async () => {
    const valueChange = vi.fn();

    await render('<app-reorder-list [value]="items" (valueChange)="valueChange($event)" />', {
      imports: [ReorderList],
      componentProperties: { items, valueChange },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Bajar Uno' }));

    expect(valueChange).toHaveBeenCalledWith([items[1], items[0], items[2]]);
  });

  it('does not move disabled items', async () => {
    const valueChange = vi.fn();
    const disabledItems = [items[0], { ...items[1], disabled: true }, items[2]];

    await render('<app-reorder-list [value]="items" (valueChange)="valueChange($event)" />', {
      imports: [ReorderList],
      componentProperties: { items: disabledItems, valueChange },
    });

    expect(screen.getByRole('button', { name: 'Subir Dos' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Bajar Dos' }).hasAttribute('disabled')).toBe(true);
  });

  it('does not cross disabled items', async () => {
    const valueChange = vi.fn();
    const disabledItems = [items[0], { ...items[1], disabled: true }, items[2]];

    await render('<app-reorder-list [value]="items" (valueChange)="valueChange($event)" />', {
      imports: [ReorderList],
      componentProperties: { items: disabledItems, valueChange },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Bajar Uno' }));
    fireEvent.click(screen.getByRole('button', { name: 'Subir Tres' }));

    expect(valueChange).not.toHaveBeenCalled();
  });

  it('does not move when disabled or readonly', async () => {
    const valueChange = vi.fn();

    await render('<app-reorder-list [value]="items" disabled readonly (valueChange)="valueChange($event)" />', {
      imports: [ReorderList],
      componentProperties: { items, valueChange },
    });

    expect(screen.getByRole('button', { name: 'Bajar Uno' }).hasAttribute('disabled')).toBe(true);
    expect(valueChange).not.toHaveBeenCalled();
  });

  it('keeps controls available when drag is disabled', async () => {
    const valueChange = vi.fn();

    await render('<app-reorder-list [value]="items" [dragEnabled]="false" (valueChange)="valueChange($event)" />', {
      imports: [ReorderList],
      componentProperties: { items, valueChange },
    });

    expect(screen.getByRole('button', { name: 'Arrastrar Uno' }).hasAttribute('disabled')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Bajar Uno' }));

    expect(valueChange).toHaveBeenCalledWith([items[1], items[0], items[2]]);
  });

  it('renders empty state', async () => {
    await render('<app-reorder-list [value]="[]" emptyText="Sin secciones" />', {
      imports: [ReorderList],
    });

    expect(screen.getByText('Sin secciones')).toBeTruthy();
  });

  it('applies size, variant and appearance classes', async () => {
    const { container } = await render('<app-reorder-list [value]="items" size="lg" variant="violet" appearance="minimal" />', {
      imports: [ReorderList],
      componentProperties: { items },
    });

    expect(container.querySelector('.reorder-list--lg')).toBeTruthy();
    expect(container.querySelector('.reorder-list--violet')).toBeTruthy();
    expect(container.querySelector('.reorder-list--minimal')).toBeTruthy();
  });
});
