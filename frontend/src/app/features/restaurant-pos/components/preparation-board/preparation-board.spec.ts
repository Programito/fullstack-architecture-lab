import { fireEvent, render, screen, within } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import type { OrderCourse, OrderLineProductSnapshot, PreparationBoardCard, PreparationBoardColumn } from '../../models/restaurant-pos.models';
import { PreparationBoard, type PreparationLineCancel, type PreparationLineMove } from './preparation-board';

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
      id: 'pending',
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
            status: 'sent_to_kitchen',
            kitchenNote: 'sin sal',
          },
        },
      ],
    },
    {
      id: 'preparing',
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
            status: 'preparing',
          },
        },
      ],
    },
    {
      id: 'ready',
      cards: [],
    },
  ];

  const servedCard: PreparationBoardCard = {
    tableId: 'table-3',
    tableNumber: 3,
    preparationFlow: 'kitchen',
    requiresReadyBeforeServed: true,
    line: {
      id: 'line-served',
      productSnapshot: productSnapshot('product-1', 'Hamburguesa craft', 'simple', 9.5, 'main'),
      productId: 'product-1',
      productName: 'Hamburguesa craft',
      quantity: 1,
      basePrice: 9.5,
      selectedModifiers: [],
      unitPrice: 9.5,
      subtotal: 9.5,
      configurationSignature: 'product-1',
      course: 'main',
      status: 'served',
    },
  };

  it('shows the three preparation columns', async () => {
    const i18n = provideI18nTesting();

    await render(PreparationBoard, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: { columns, servedCards: [], warning: null },
    });

    expect(screen.getByRole('heading', { name: 'Preparación' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Pendiente' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Preparándose' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Preparado' })).toBeTruthy();
  });

  it('renders card content including notes, modifiers and combo slots', async () => {
    const i18n = provideI18nTesting();

    await render(PreparationBoard, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: { columns, servedCards: [], warning: null },
    });

    expect(within(screen.getByText('Pendiente').closest('section') as HTMLElement).getByText('Mesa 4')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Plato combinado vegetal' })).toBeTruthy();
    expect(screen.getByText(/sin sal/)).toBeTruthy();
    expect(screen.getByText(/Incluye:/)).toBeTruthy();
    expect(screen.getByText(/huevo, patatas, ensalada/)).toBeTruthy();
    expect(screen.getByText(/Burger:/)).toBeTruthy();
    expect(screen.getByText(/Truffle Burger \+2,00/)).toBeTruthy();
  });

  it('renders remove modifiers as red pills', async () => {
    const i18n = provideI18nTesting();

    await render(PreparationBoard, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: { columns, servedCards: [], warning: null },
    });

    const pill = screen.getByText('SIN Sal');
    expect(pill.tagName.toLowerCase()).toBe('span');
    expect(pill.className).toMatch(/text-red/);
  });

  it('shows action buttons per column', async () => {
    const i18n = provideI18nTesting();

    await render(PreparationBoard, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: { columns, servedCards: [], warning: null },
    });

    expect(screen.getByRole('button', { name: 'Preparándose' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Preparado' })).toBeTruthy();
  });

  it('emits lineMoved when action buttons are clicked', async () => {
    const i18n = provideI18nTesting();
    const lineMoved = vi.fn<(move: PreparationLineMove) => void>();

    const { fixture } = await render(PreparationBoard, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: { columns, servedCards: [], warning: null },
    });
    fixture.componentInstance.lineMoved.subscribe(lineMoved);

    fireEvent.click(screen.getByRole('button', { name: 'Preparándose' }));
    expect(lineMoved).toHaveBeenCalledWith({ tableId: 'table-4', lineId: 'line-platter', targetColumnId: 'preparing' });

    fireEvent.click(screen.getByRole('button', { name: 'Preparado' }));
    expect(lineMoved).toHaveBeenCalledWith({ tableId: 'table-2', lineId: 'line-combo', targetColumnId: 'ready' });
  });

  it('shows the served count button when there are served cards', async () => {
    const i18n = provideI18nTesting();

    await render(PreparationBoard, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: { columns, servedCards: [servedCard], warning: null },
    });

    expect(screen.getByRole('button', { name: /servido/i })).toBeTruthy();
    expect(screen.getByText(/1 servido/)).toBeTruthy();
  });

  it('opens the served modal when the badge is clicked', async () => {
    const i18n = provideI18nTesting();

    await render(PreparationBoard, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: { columns, servedCards: [servedCard], warning: null },
    });

    fireEvent.click(screen.getByRole('button', { name: /servido/i }));

    expect(screen.getByRole('heading', { name: 'Líneas servidas' })).toBeTruthy();
    expect(screen.getByText(/Hamburguesa craft/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancelar línea' })).toBeTruthy();
  });

  it('shows inline confirmation on cancel and emits lineCancelled on confirm', async () => {
    const i18n = provideI18nTesting();
    const lineCancelled = vi.fn<(cancel: PreparationLineCancel) => void>();

    const { fixture } = await render(PreparationBoard, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: { columns, servedCards: [servedCard], warning: null },
    });
    fixture.componentInstance.lineCancelled.subscribe(lineCancelled);

    fireEvent.click(screen.getByRole('button', { name: /servido/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar línea' }));

    expect(screen.getByText(/¿Cancelar esta línea\?/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sí, cancelar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }));
    expect(lineCancelled).toHaveBeenCalledWith({ tableId: 'table-3', lineId: 'line-served' });
  });

  it('shows a validation warning', async () => {
    const i18n = provideI18nTesting();

    await render(PreparationBoard, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: { columns, servedCards: [], warning: 'No se ha podido mover la línea.' },
    });

    expect(screen.getByText('No se ha podido mover la línea.')).toBeTruthy();
  });
});
