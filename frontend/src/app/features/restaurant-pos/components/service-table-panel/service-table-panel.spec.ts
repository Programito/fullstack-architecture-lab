import { fireEvent, render, screen, within } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import type { OrderCourseGroup, RestaurantTable, ServiceTableInfo, TableOrder } from '../../models/restaurant-pos.models';
import { ServiceTablePanel } from './service-table-panel';

describe('ServiceTablePanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-10T12:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const table: RestaurantTable = {
    id: 'table-1',
    number: 1,
    capacity: 4,
    status: 'occupied',
    total: 12.5,
    openDuration: '10m',
    occupiedAt: '2026-06-10T12:05:00.000Z',
    serviceStartedAt: '2026-06-10T12:05:00.000Z',
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

  const createServiceInfo = (
    currentTable: RestaurantTable,
    currentOrder: TableOrder,
    patch: Partial<ServiceTableInfo> = {},
  ): ServiceTableInfo => {
    const courseGroups = ['drinks', 'starter', 'main', 'dessert', 'other']
      .map((course) => {
        const lines = currentOrder.lines.filter((line) => line.course === course);

        return {
          course,
          lines,
          quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
          total: lines.reduce((sum, line) => sum + line.subtotal, 0),
        } as OrderCourseGroup;
      })
      .filter((group) => group.lines.length > 0);
    const pendingKitchenCount = currentOrder.lines.filter((line) => line.status === 'pending').reduce((sum, line) => sum + line.quantity, 0);

    return {
      table: currentTable,
      order: currentOrder,
      courseGroups,
      pendingKitchenCount,
      servicePhase: { course: 'main', status: 'pending' },
      nextAction: pendingKitchenCount > 0 ? { type: 'send_kitchen', count: pendingKitchenCount } : { type: 'none', count: 0 },
      canSendToKitchen: pendingKitchenCount > 0,
      canMarkServed: currentOrder.lines.some((line) => line.status !== 'served'),
      canCharge: currentOrder.total > 0,
      canMarkCleaning: true,
      canFreeTable: false,
      ...patch,
    };
  };

  it('renders selected table details, order lines, and service actions', async () => {
    const i18n = provideI18nTesting();
    const increaseProduct = vi.fn();
    const decreaseProduct = vi.fn();

    const { fixture } = await render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        serviceInfo: createServiceInfo(table, order, {
          canSendToKitchen: true,
          canMarkServed: true,
          canCharge: true,
          canMarkCleaning: true,
        }),
        title: 'Mesa 1',
        errorMessage: null,
      },
    });
    fixture.componentInstance.increaseProduct.subscribe(increaseProduct);
    fixture.componentInstance.decreaseProduct.subscribe(decreaseProduct);

    expect(screen.getByLabelText('Panel de mesa seleccionada')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Mesa 1' })).toBeTruthy();
    expect(screen.getByText('Ocupada · 25m · Principal pendiente · 12,50 €')).toBeTruthy();
    expect(screen.getByText('Fase')).toBeTruthy();
    expect(screen.getByText('Principal pendiente')).toBeTruthy();
    expect(screen.getByText('4 pax')).toBeTruthy();
    expect(screen.getByText('1 x Craft Burger')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Añadir una unidad de Craft Burger' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar una unidad de Craft Burger' }));
    expect(increaseProduct).toHaveBeenCalledWith('burger');
    expect(decreaseProduct).toHaveBeenCalledWith('burger');
    expect(screen.getByRole('button', { name: /Cocina/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Cobrar/i })).toBeTruthy();
    expect(screen.queryByText('Añadir rápido')).toBeNull();
  });

  it('groups order lines by course and highlights the next service action', async () => {
    const i18n = provideI18nTesting();
    const multiCourseOrder: TableOrder = {
      ...order,
      total: 17,
      lines: [
        {
          productId: 'water',
          productName: 'Agua',
          quantity: 1,
          unitPrice: 2,
          subtotal: 2,
          course: 'drinks',
          status: 'served',
        },
        ...order.lines,
      ],
    };

    await render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        serviceInfo: createServiceInfo(table, multiCourseOrder, {
          canSendToKitchen: true,
          canMarkServed: false,
          canCharge: false,
          canMarkCleaning: false,
        }),
        title: 'Mesa 1',
        errorMessage: null,
      },
    });

    expect(screen.getByText('Siguiente: enviar 1 a cocina')).toBeTruthy();
    expect(screen.getByText('Pendiente cocina: 1')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Bebidas' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Principal' })).toBeTruthy();
    expect(screen.getByText('1 x Agua')).toBeTruthy();
    expect(screen.getByText('1 x Craft Burger')).toBeTruthy();
  });

  it('disables closing actions until the table can be closed and confirms before freeing it', async () => {
    const i18n = provideI18nTesting();
    const freeTable = vi.fn();
    const { fixture } = await render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        serviceInfo: createServiceInfo(table, order, {
          canSendToKitchen: false,
          canMarkServed: false,
          canCharge: false,
          canMarkCleaning: true,
          canFreeTable: false,
        }),
        title: 'Mesa 1',
        errorMessage: null,
      },
    });
    fixture.componentInstance.freeTable.subscribe(freeTable);

    expect(screen.getByRole('button', { name: /Cobrar la mesa seleccionada/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /Liberar la mesa seleccionada/i }).hasAttribute('disabled')).toBe(true);

    fixture.componentRef.setInput(
      'serviceInfo',
      createServiceInfo(table, order, {
        canSendToKitchen: false,
        canMarkServed: false,
        canCharge: false,
        canMarkCleaning: true,
        canFreeTable: true,
      }),
    );
    fixture.detectChanges();
    fireEvent.click(screen.getByRole('button', { name: /Liberar la mesa seleccionada/i }));

    const dialog = screen.getByRole('dialog', { name: 'Liberar mesa' });
    expect(dialog).toBeTruthy();
    expect(freeTable).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Liberar mesa' }));

    expect(freeTable).toHaveBeenCalledTimes(1);
  });
});
