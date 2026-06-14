import { fireEvent, render, screen, within } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import type { OrderCourse, OrderLineProductSnapshot, PreparationBoardColumn } from '../../models/restaurant-pos.models';
import { PreparationBoard, type PreparationLineMove } from './preparation-board';

describe('PreparationBoard', () => {
  const productSnapshot = (
    productId: string,
    productName: string,
    productType: OrderLineProductSnapshot['productType'],
    basePrice: number,
    course: OrderCourse,
    requiresReadyBeforeServe = true,
  ): OrderLineProductSnapshot => ({
    productId,
    productName,
    productType,
    basePrice,
    course,
    preparationPolicy: {
      route: requiresReadyBeforeServe ? 'kitchen' : 'bar',
      requiresReadyBeforeServe,
    },
  });

  const columns: PreparationBoardColumn[] = [
    {
      id: 'in_kitchen',
      cards: [
        {
          tableId: 'table-4',
          tableNumber: 4,
          preparationFlow: 'kitchen',
          requiresReadyBeforeServed: true,
          station: 'Cocina',
          line: {
            id: 'line-platter',
            productSnapshot: productSnapshot('product-19', 'Plato combinado vegetal', 'platter', 11.9, 'main'),
            productId: 'product-19',
            productName: 'Plato combinado vegetal',
            quantity: 2,
            basePrice: 11.9,
            selectedModifiers: [{ groupId: 'remove', groupName: 'Remove ingredients', optionId: 'no-salt', name: 'Sal', type: 'remove', priceDelta: 0 }],
            platterComponents: [
              { id: 'egg', name: 'Huevo', removable: true, replaceable: false },
              { id: 'fries', name: 'Patatas', removable: true, replaceable: false },
              { id: 'salad', name: 'Ensalada', removable: true, replaceable: false },
            ],
            unitPrice: 11.9,
            subtotal: 23.8,
            configurationSignature: 'product-19::no-salt',
            course: 'main',
            status: 'pending',
            kitchenNote: 'sin sal',
          },
        },
      ],
    },
    {
      id: 'ready',
      cards: [
        {
          tableId: 'table-2',
          tableNumber: 2,
          preparationFlow: 'kitchen',
          requiresReadyBeforeServed: true,
          line: {
            id: 'line-combo',
            productSnapshot: productSnapshot('product-16', 'Classic Burger Menu', 'combo', 13.5, 'main'),
            productId: 'product-16',
            productName: 'Classic Burger Menu',
            quantity: 1,
            basePrice: 13.5,
            selectedModifiers: [],
            selectedComboSlots: [
              {
                slotId: 'combo-burger',
                slotName: 'Burger',
                selectedProducts: [
                  {
                    productId: 'product-7',
                    productName: 'Truffle Burger',
                    productType: 'simple',
                    course: 'main',
                    preparationPolicy: { route: 'kitchen', requiresReadyBeforeServe: true },
                    supplementPrice: 2,
                  },
                ],
              },
            ],
            unitPrice: 15.5,
            subtotal: 15.5,
            configurationSignature: 'combo:product-16',
            course: 'main',
            status: 'ready',
          },
        },
      ],
    },
    { id: 'served', cards: [] },
  ];

  it('groups order line cards by preparation status', async () => {
    const i18n = provideI18nTesting();

    await render(PreparationBoard, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: { columns, warning: null },
    });

    expect(screen.getByRole('heading', { name: 'Preparación' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'En cocina' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Preparado' })).toBeTruthy();
    expect(within(screen.getByText('En cocina').closest('section') as HTMLElement).getByText('Mesa 4')).toBeTruthy();
    expect(screen.getByText('2x Plato combinado vegetal')).toBeTruthy();
    expect(screen.getByText(/Incluye:/)).toBeTruthy();
    expect(screen.getByText(/huevo, patatas, ensalada/)).toBeTruthy();
    expect(screen.getByText(/Nota:/)).toBeTruthy();
    expect(screen.getByText(/sin sal/)).toBeTruthy();
    expect(screen.getByText(/Burger:/)).toBeTruthy();
    expect(screen.getByText(/Truffle Burger \+2,00/)).toBeTruthy();
  });

  it('emits preparation moves from fallback actions', async () => {
    const i18n = provideI18nTesting();
    const lineMoved = vi.fn<(move: PreparationLineMove) => void>();

    const { fixture } = await render(PreparationBoard, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: { columns, warning: null },
    });
    fixture.componentInstance.lineMoved.subscribe(lineMoved);

    fireEvent.click(screen.getAllByRole('button', { name: 'Marcar preparado' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Marcar servido' })[0]);

    expect(lineMoved).toHaveBeenCalledWith({ tableId: 'table-4', lineId: 'line-platter', targetColumnId: 'ready' });
    expect(lineMoved).toHaveBeenCalledWith({ tableId: 'table-4', lineId: 'line-platter', targetColumnId: 'served' });
  });

  it('shows validation warnings', async () => {
    const i18n = provideI18nTesting();

    await render(PreparationBoard, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: { columns, warning: 'Este producto todavía no está marcado como preparado.' },
    });

    expect(screen.getByText('Este producto todavía no está marcado como preparado.')).toBeTruthy();
  });
});
