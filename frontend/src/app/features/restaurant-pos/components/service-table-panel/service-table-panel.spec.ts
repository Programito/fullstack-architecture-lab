import { fireEvent, render, screen, within } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import type { Product, RestaurantTable, TableOrder } from '../../models/restaurant-pos.models';
import { ServiceTablePanel } from './service-table-panel';

describe('ServiceTablePanel', () => {
  const table: RestaurantTable = {
    id: 'table-1',
    number: 1,
    capacity: 4,
    status: 'occupied',
    total: 12.5,
    openDuration: '10m',
  };

  const order: TableOrder = {
    tableId: 'table-1',
    status: 'open',
    paymentMethod: 'cash',
    total: 12.5,
    lines: [
      {
        productId: 'burger',
        productName: 'Craft Burger',
        quantity: 1,
        unitPrice: 12.5,
        subtotal: 12.5,
        course: 'main',
        status: 'pending',
      },
    ],
  };

  const quickProducts: Product[] = [
    {
      id: 'lemonade',
      name: 'Sparkling Lemonade',
      category: 'Bebidas',
      price: 4.5,
      available: true,
    },
  ];

  it('renders selected table details, order lines, and service actions', async () => {
    const i18n = provideI18nTesting();

    await render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        table,
        order,
        title: 'Mesa 1',
        quickProducts,
        errorMessage: null,
        canSendToKitchen: true,
        canMarkServed: true,
        canCharge: true,
        canMarkCleaning: true,
        canFreeTable: false,
      },
    });

    expect(screen.getByLabelText('Panel de mesa seleccionada')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Mesa 1' })).toBeTruthy();
    expect(screen.getByText('4 pax')).toBeTruthy();
    expect(screen.getByText('1 x Craft Burger')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Cocina/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Cobrar/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sparkling Lemonade/i })).toBeTruthy();
  });

  it('disables closing actions until the table can be closed and confirms before freeing it', async () => {
    const i18n = provideI18nTesting();
    const freeTable = vi.fn();
    const { fixture } = await render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        table,
        order,
        title: 'Mesa 1',
        quickProducts,
        errorMessage: null,
        canSendToKitchen: false,
        canMarkServed: false,
        canCharge: false,
        canMarkCleaning: true,
        canFreeTable: false,
      },
    });
    fixture.componentInstance.freeTable.subscribe(freeTable);

    expect(screen.getByRole('button', { name: /Cobrar la mesa seleccionada/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /Liberar la mesa seleccionada/i }).hasAttribute('disabled')).toBe(true);

    fixture.componentRef.setInput('canFreeTable', true);
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Liberar la mesa seleccionada/i }));

    const dialog = screen.getByRole('dialog', { name: 'Liberar mesa' });
    expect(dialog).toBeTruthy();
    expect(freeTable).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Liberar mesa' }));

    expect(freeTable).toHaveBeenCalledTimes(1);
  });
});
