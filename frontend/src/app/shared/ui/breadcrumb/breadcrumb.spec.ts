import { fireEvent, render, screen } from '@testing-library/angular';
import { Breadcrumb, type BreadcrumbItem } from './breadcrumb';

const items: BreadcrumbItem[] = [
  { label: 'Inicio', href: '#' },
  { label: 'Clientes' },
  { label: 'Acme', current: true },
];

describe('Breadcrumb', () => {
  it('renders navigation and current page', async () => {
    await render('<app-breadcrumb [items]="items" />', {
      imports: [Breadcrumb],
      componentProperties: { items },
    });

    expect(screen.getByRole('navigation', { name: 'Miga de pan' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Acme' }).getAttribute('aria-current')).toBe('page');
  });

  it('emits when selecting a button item', async () => {
    const itemSelected = vi.fn();

    await render('<app-breadcrumb [items]="items" (itemSelected)="itemSelected($event)" />', {
      imports: [Breadcrumb],
      componentProperties: { items, itemSelected },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clientes' }));

    expect(itemSelected).toHaveBeenCalledWith(items[1]);
  });

  it('does not emit disabled items', async () => {
    const itemSelected = vi.fn();
    const disabledItems: BreadcrumbItem[] = [{ label: 'Inicio', disabled: true }, { label: 'Actual', current: true }];

    await render('<app-breadcrumb [items]="items" (itemSelected)="itemSelected($event)" />', {
      imports: [Breadcrumb],
      componentProperties: { items: disabledItems, itemSelected },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Inicio' }));

    expect(itemSelected).not.toHaveBeenCalled();
  });
});
