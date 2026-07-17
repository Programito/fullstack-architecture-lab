import { fireEvent, render, screen, within } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import type { OrderCourse, OrderCourseGroup, OrderLineProductSnapshot, RestaurantTable, ServiceTableInfo, TableOrder } from '../../models/restaurant-pos.models';
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

  const productSnapshot = (
    productId: string,
    productName: string,
    basePrice: number,
    course: OrderCourse,
    requiresReadyBeforeServe = true,
  ): OrderLineProductSnapshot => ({
    productId,
    productName,
    productType: 'simple',
    basePrice,
    course,
    preparationPolicy: {
      route: requiresReadyBeforeServe ? 'kitchen' : 'bar',
      requiresReadyBeforeServe,
    },
  });

  const order: TableOrder = {
    tableId: 'table-1',
    status: 'open',
    paymentMethod: 'cash',
    tax: 2.17,
    total: 12.5,
    lines: [
      {
        id: 'line-burger',
        productSnapshot: productSnapshot('burger', 'Craft Burger', 12.5, 'main'),
        productId: 'burger',
        productName: 'Craft Burger',
        quantity: 1,
        basePrice: 12.5,
        selectedModifiers: [],
        unitPrice: 12.5,
        subtotal: 12.5,
        configurationSignature: 'burger::',
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
      paidOrders: [],
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

  const renderServiceTablePanel = (patch: Partial<ServiceTableInfo> = {}) => {
    const i18n = provideI18nTesting();

    return render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        serviceInfo: createServiceInfo(table, order, patch),
        title: 'Mesa 1',
        errorMessage: null,
      },
    });
  };

  it('renders the selected table panel as workflow-first sections', async () => {
    await renderServiceTablePanel();

    expect(screen.getByRole('heading', { name: 'Resumen' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Pedido' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Cocina' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Cobro' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Cierre' })).toBeTruthy();
  });

  it('emphasizes the next action inside the matching workflow section', async () => {
    await renderServiceTablePanel({ nextAction: { type: 'charge', count: 0 } });

    expect(screen.getByTestId('service-panel-next-action').textContent).toContain('Siguiente: cobrar');
    expect(screen.getByTestId('service-panel-payment-section').getAttribute('data-highlighted')).toBe('true');
  });

  it('guides an occupied table with an empty order to the order section', async () => {
    const i18n = provideI18nTesting();
    const emptyOrder: TableOrder = { ...order, total: 0, lines: [] };

    await render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        serviceInfo: createServiceInfo({ ...table, total: 0 }, emptyOrder, {
          servicePhase: { course: null, status: 'no_order' },
          nextAction: { type: 'cleaning', count: 0 },
        }),
        title: 'Mesa 1',
        errorMessage: null,
      },
    });

    expect(screen.getByTestId('service-panel-next-action').textContent).toContain('Siguiente: añade productos al pedido');
    expect(screen.getByTestId('service-panel-order-section').getAttribute('data-highlighted')).toBe('true');
    expect(screen.getByTestId('service-panel-closing-section').getAttribute('data-highlighted')).toBe('false');
  });

  it('guides a free table to start service from the summary section', async () => {
    const i18n = provideI18nTesting();
    const emptyOrder: TableOrder = { ...order, total: 0, lines: [] };

    await render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        serviceInfo: createServiceInfo({ ...table, status: 'free', total: 0 }, emptyOrder, {
          servicePhase: { course: null, status: 'no_order' },
          nextAction: { type: 'none', count: 0 },
          canMarkCleaning: false,
        }),
        title: 'Mesa 1',
        errorMessage: null,
      },
    });

    expect(screen.getByTestId('service-panel-next-action').textContent).toContain('Siguiente: iniciar servicio');
    expect(screen.getByTestId('service-panel-summary-section').getAttribute('data-highlighted')).toBe('true');
    expect(screen.getByTestId('service-panel-order-section').getAttribute('data-highlighted')).toBe('false');
  });

  it('guides a reserved table to start service from the summary section', async () => {
    const i18n = provideI18nTesting();
    const emptyOrder: TableOrder = { ...order, total: 0, lines: [] };

    await render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        serviceInfo: createServiceInfo({ ...table, status: 'reserved', total: 0 }, emptyOrder, {
          servicePhase: { course: null, status: 'no_order' },
          nextAction: { type: 'none', count: 0 },
          canMarkCleaning: false,
        }),
        title: 'Mesa 1',
        errorMessage: null,
      },
    });

    expect(screen.getByTestId('service-panel-next-action').textContent).toContain('Siguiente: iniciar servicio');
    expect(screen.getByTestId('service-panel-summary-section').getAttribute('data-highlighted')).toBe('true');
    expect(screen.getByTestId('service-panel-order-section').getAttribute('data-highlighted')).toBe('false');
  });

  it('applies a visible highlighted treatment to the active workflow section', async () => {
    const { fixture } = await renderServiceTablePanel({ nextAction: { type: 'send_kitchen', count: 1 } });
    const highlightedTransitions = [
      { nextAction: { type: 'send_kitchen' as const, count: 1 }, testId: 'service-panel-kitchen-section' },
      { nextAction: { type: 'charge' as const, count: 0 }, testId: 'service-panel-payment-section' },
      { nextAction: { type: 'cleaning' as const, count: 0 }, testId: 'service-panel-closing-section' },
    ];

    highlightedTransitions.forEach(({ nextAction, testId }) => {
      fixture.componentRef.setInput('serviceInfo', createServiceInfo(table, order, { nextAction }));
      fixture.detectChanges();

      const section = screen.getByTestId(testId);
      expect(section.getAttribute('data-highlighted')).toBe('true');
      expect(section.className).toContain('ring-2');
    });
  });

  it('exposes workflow-first panel sections with one highlighted next step', async () => {
    const i18n = provideI18nTesting();
    const { fixture } = await render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        serviceInfo: createServiceInfo(table, order, { nextAction: { type: 'send_kitchen', count: 2 } }),
        title: 'Mesa 1',
        errorMessage: null,
      },
    });
    const component = fixture.componentInstance as ServiceTablePanel & {
      selectedServiceWorkflowSections(): Array<{ id: string; highlighted: boolean }>;
    };

    expect(component.selectedServiceWorkflowSections().filter((section) => section.highlighted)).toEqual([
      expect.objectContaining({ id: 'kitchen' }),
    ]);

    fixture.componentRef.setInput('serviceInfo', createServiceInfo(table, order, { nextAction: { type: 'charge', count: 0 } }));
    fixture.detectChanges();

    expect(component.selectedServiceWorkflowSections().filter((section) => section.highlighted)).toEqual([
      expect.objectContaining({ id: 'payment' }),
    ]);

    const workflowTransitions = [
      { nextAction: { type: 'mark_served' as const, count: 0 }, highlightedId: 'kitchen' },
      { nextAction: { type: 'cleaning' as const, count: 0 }, highlightedId: 'closing' },
      { nextAction: { type: 'free_table' as const, count: 0 }, highlightedId: 'closing' },
    ];

    workflowTransitions.forEach(({ nextAction, highlightedId }) => {
      fixture.componentRef.setInput('serviceInfo', createServiceInfo(table, order, { nextAction }));
      fixture.detectChanges();

      expect(component.selectedServiceWorkflowSections().filter((section) => section.highlighted)).toEqual([
        expect.objectContaining({ id: highlightedId }),
      ]);
    });
  });

  it('renders selected table details, order lines, and service actions', async () => {
    const i18n = provideI18nTesting();
    const increaseProduct = vi.fn();
    const decreaseProduct = vi.fn();
    const occupy = vi.fn();

    const { fixture, container } = await render(ServiceTablePanel, {
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
    fixture.componentInstance.occupy.subscribe(occupy);

    expect(screen.getByLabelText('Panel de mesa seleccionada')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Mesa 1' })).toBeTruthy();
    expect(screen.getByText('Ocupada · 25m · Principal pendiente · 12,50 €')).toBeTruthy();
    expect(screen.getByText('4 pax')).toBeTruthy();
    expect(screen.getByText('1 x Craft Burger')).toBeTruthy();
    expect(container.querySelector('.theme-order-line')).toBeTruthy();
    expect(container.querySelector('.theme-quantity-stepper')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar servicio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Añadir una unidad de Craft Burger' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar una unidad de Craft Burger' }));
    expect(occupy).toHaveBeenCalledTimes(1);
    expect(increaseProduct).toHaveBeenCalledWith('line-burger');
    expect(decreaseProduct).toHaveBeenCalledWith('line-burger');
    expect(screen.getByRole('button', { name: /Cocina/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Cobrar/i })).toBeTruthy();
    expect(screen.queryByText('Añadir rápido')).toBeNull();
  });

  it('includes the formatted total in the payment CTA and its accessible label', async () => {
    await renderServiceTablePanel({ canCharge: true });

    const paymentButton = screen.getByRole('button', { name: /Cobrar la mesa seleccionada por 12,50\s?€/i });
    expect(paymentButton).toBeTruthy();
    expect(paymentButton.textContent).toContain('Cobrar 12,50');
  });

  it('disables the charge action until a cash or card method is selected', async () => {
    const i18n = provideI18nTesting();
    const pendingPaymentOrder: TableOrder = {
      ...order,
      paymentMethod: 'pending',
    };

    await render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        serviceInfo: createServiceInfo(table, pendingPaymentOrder, { canCharge: true }),
        title: 'Mesa 1',
        errorMessage: null,
      },
    });

    expect(screen.getByRole('button', { name: /Cobrar la mesa seleccionada/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByTestId('payment-method-hint').textContent).toContain('Selecciona un tipo de pago para poder cobrar');
  });

  it('keeps the charge action disabled and busy while a charge is in progress', async () => {
    const i18n = provideI18nTesting();

    await render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        serviceInfo: createServiceInfo(table, order, { canCharge: true }),
        title: 'Mesa 1',
        errorMessage: null,
        isCharging: true,
      },
    });

    const chargeButton = screen.getByRole('button', { name: /Cobrar la mesa seleccionada/i });
    expect(chargeButton.getAttribute('aria-busy')).toBe('true');
    expect(chargeButton.hasAttribute('disabled')).toBe(true);
  });

  it('emits cancellation from served-selection mode without changing the selected lines', async () => {
    const i18n = provideI18nTesting();
    const readyLine = { ...order.lines[0], status: 'ready' as const };
    const { fixture } = await render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        serviceInfo: createServiceInfo(table, { ...order, lines: [readyLine] }),
        title: 'Mesa 1',
        errorMessage: null,
        servedSelectionMode: true,
        servedLineIds: [readyLine.id],
        servableLines: [readyLine],
      },
    });
    const cancelServedSelection = vi.fn();
    fixture.componentInstance.cancelServedSelection.subscribe(cancelServedSelection);

    expect((screen.getByRole('checkbox', { name: 'Craft Burger' }) as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(cancelServedSelection).toHaveBeenCalledTimes(1);
  });

  it('localizes served-selection controls in English', async () => {
    const i18n = provideI18nTesting('en');
    const readyLine = { ...order.lines[0], status: 'ready' as const };

    await render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        serviceInfo: createServiceInfo(table, { ...order, lines: [readyLine] }),
        title: 'Table 1',
        errorMessage: null,
        servedSelectionMode: true,
        servedLineIds: [readyLine.id],
        servableLines: [readyLine],
      },
    });

    const servedSelectionHeading = screen.getByRole('heading', { name: 'Kitchen' }).closest('section');
    expect(servedSelectionHeading).toBeTruthy();
    expect(screen.getAllByText('Select served items').length).toBeGreaterThan(0);
    const servedSelectionTitle = screen.getAllByText('Select served items')[0]?.closest('div');
    expect(servedSelectionTitle?.contains(screen.getByRole('checkbox', { name: 'Select all' }))).toBe(true);
    expect(within(screen.getByTestId('service-panel-kitchen-section')).getByText('1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('renders the last completed payment summary for a paid table', async () => {
    const paidOrder: TableOrder = {
      ...order,
      status: 'paid',
      lastCompletedPayment: {
        id: 'payment-1',
        method: 'card',
        amount: 12.5,
        status: 'completed',
        paidAt: '2026-07-17T12:30:00.000Z',
      },
    };

    await renderServiceTablePanel({
      table: { ...table, status: 'paid' },
      order: paidOrder,
      paidSummary: {
        isPaid: true,
        lastPayment: paidOrder.lastCompletedPayment,
        lastOrderTotal: paidOrder.total,
      },
      paidOrders: [paidOrder],
    });

    const paidSummary = screen.getByTestId('paid-summary');
    expect(within(paidSummary).getByText('Pagado')).toBeTruthy();
    expect(within(paidSummary).getByText('Tarjeta')).toBeTruthy();
    expect(within(paidSummary).getByText(/12,50/)).toBeTruthy();
  });

  it('renders the localized other payment method in the paid summary', async () => {
    const paidOrder: TableOrder = {
      ...order,
      status: 'paid',
      lastCompletedPayment: {
        id: 'payment-other',
        method: 'other',
        amount: 12.5,
        status: 'completed',
        paidAt: '2026-07-17T12:30:00.000Z',
      },
    };

    await renderServiceTablePanel({
      table: { ...table, status: 'paid' },
      order: paidOrder,
      paidSummary: {
        isPaid: true,
        lastPayment: paidOrder.lastCompletedPayment,
        lastOrderTotal: paidOrder.total,
      },
      paidOrders: [paidOrder],
    });

    expect(within(screen.getByTestId('paid-summary')).getByText('Otro')).toBeTruthy();
  });

  it('renders the payment history even after a new active order starts', async () => {
    const paidOrder: TableOrder = {
      ...order,
      id: 'paid-order-1',
      status: 'paid',
      paymentMethod: 'card',
      lastCompletedPayment: {
        id: 'payment-1',
        method: 'card',
        amount: 12.5,
        status: 'completed',
        paidAt: '2026-07-17T12:30:00.000Z',
      },
    };
    const newActiveOrder: TableOrder = {
      ...order,
      id: 'active-order-2',
      status: 'open',
      paymentMethod: 'pending',
      total: 4.5,
      lines: [
        {
          ...order.lines[0],
          id: 'line-water',
          productSnapshot: productSnapshot('water', 'Agua', 4.5, 'drinks', false),
          productId: 'water',
          productName: 'Agua',
          basePrice: 4.5,
          unitPrice: 4.5,
          subtotal: 4.5,
          configurationSignature: 'water::',
          course: 'drinks',
        },
      ],
    };

    await renderServiceTablePanel({
      table: { ...table, status: 'occupied', total: 4.5 },
      order: newActiveOrder,
      paidSummary: {
        isPaid: true,
        lastPayment: paidOrder.lastCompletedPayment,
        lastOrderTotal: paidOrder.total,
      },
      paidOrders: [paidOrder],
    });

    const paymentHistory = screen.getByTestId('payment-history');
    expect(within(paymentHistory).getByText('Historial de cobros')).toBeTruthy();
    expect(within(paymentHistory).getByText(/Total cobrado: 12,50/)).toBeTruthy();
    expect(within(paymentHistory).getByText('1 cobro')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Cobrar la mesa seleccionada por 4,50/i })).toBeTruthy();

    fireEvent.click(within(paymentHistory).getByRole('button'));

    expect(within(paymentHistory).getByText('Tarjeta')).toBeTruthy();
    expect(within(paymentHistory).getByText(/12,50/)).toBeTruthy();
  });

  it('shows a tax breakdown with taxable base, VAT, and total in the payment section', async () => {
    await renderServiceTablePanel({ canCharge: true });

    const paymentSection = screen.getByTestId('service-panel-payment-section');
    expect(within(paymentSection).getByText('Base imponible')).toBeTruthy();
    expect(within(paymentSection).getByText(/10,33/)).toBeTruthy();
    expect(within(paymentSection).getByText('IVA incluido')).toBeTruthy();
    expect(within(paymentSection).getByText(/2,17/)).toBeTruthy();
    expect(within(paymentSection).getAllByText(/12,50/).length).toBeGreaterThan(0);
  });

  it('groups order lines by course and highlights the next service action', async () => {
    const i18n = provideI18nTesting();
    const multiCourseOrder: TableOrder = {
      ...order,
      total: 17,
      lines: [
        {
          id: 'line-water',
          productSnapshot: productSnapshot('water', 'Agua', 2, 'drinks', false),
          productId: 'water',
          productName: 'Agua',
          quantity: 1,
          basePrice: 2,
          selectedModifiers: [],
          unitPrice: 2,
          subtotal: 2,
          configurationSignature: 'water::',
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
    const kitchenSection = screen.getByTestId('service-panel-kitchen-section');
    expect(within(kitchenSection).getByText('Pendiente cocina')).toBeTruthy();
    expect(within(kitchenSection).getByText('1')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Bebidas' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Principal' })).toBeTruthy();
    expect(screen.getByText('1 x Agua')).toBeTruthy();
    expect(screen.getByText('1 x Craft Burger')).toBeTruthy();
  });

  it('groups identical pending order lines into a single order row', async () => {
    const i18n = provideI18nTesting();
    const duplicatedOrder: TableOrder = {
      ...order,
      total: 8.4,
      lines: [
        {
          id: 'line-wine-1',
          productSnapshot: productSnapshot('wine-glass', 'Vino tinto copa', 4.2, 'drinks', false),
          productId: 'wine-glass',
          productName: 'Vino tinto copa',
          quantity: 1,
          basePrice: 4.2,
          selectedModifiers: [],
          unitPrice: 4.2,
          subtotal: 4.2,
          configurationSignature: 'wine-glass::',
          course: 'drinks',
          status: 'pending',
        },
        {
          id: 'line-wine-2',
          productSnapshot: productSnapshot('wine-glass', 'Vino tinto copa', 4.2, 'drinks', false),
          productId: 'wine-glass',
          productName: 'Vino tinto copa',
          quantity: 1,
          basePrice: 4.2,
          selectedModifiers: [],
          unitPrice: 4.2,
          subtotal: 4.2,
          configurationSignature: 'wine-glass::',
          course: 'drinks',
          status: 'pending',
        },
      ],
    };

    await render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        serviceInfo: createServiceInfo(table, duplicatedOrder),
        title: 'Mesa 1',
        errorMessage: null,
      },
    });

    expect(screen.getByText('2 x Vino tinto copa')).toBeTruthy();
    expect(screen.getByText('2 uds · 8,40 €')).toBeTruthy();
    expect(screen.queryByText('1 x Vino tinto copa')).toBeNull();
  });

  it('renders combo slot selections with supplements', async () => {
    const i18n = provideI18nTesting();
    const comboOrder: TableOrder = {
      ...order,
      total: 16.5,
      lines: [
        {
          id: 'line-combo',
          productSnapshot: {
            ...productSnapshot('product-16', 'Classic Burger Menu', 13.5, 'main'),
            productType: 'combo',
          },
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
            {
              slotId: 'combo-side',
              slotName: 'Side',
              selectedProducts: [
                {
                  productId: 'product-9',
                  productName: 'Patatas Bravas',
                  productType: 'simple',
                  course: 'starter',
                  preparationPolicy: { route: 'kitchen', requiresReadyBeforeServe: true },
                  supplementPrice: 1,
                },
              ],
            },
            {
              slotId: 'combo-drink',
              slotName: 'Drink',
              selectedProducts: [
                {
                  productId: 'product-10',
                  productName: 'Water',
                  productType: 'simple',
                  course: 'drinks',
                  preparationPolicy: { route: 'bar', requiresReadyBeforeServe: false },
                  supplementPrice: 0,
                },
              ],
            },
          ],
          unitPrice: 16.5,
          subtotal: 16.5,
          configurationSignature: 'combo:product-16',
          course: 'main',
          status: 'pending',
        },
      ],
    };

    await render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        serviceInfo: createServiceInfo(table, comboOrder),
        title: 'Mesa 1',
        errorMessage: null,
      },
    });

    expect(screen.getByText('1 x Classic Burger Menu')).toBeTruthy();
    expect(screen.getByText(/Burger:/)).toBeTruthy();
    expect(screen.getByText(/Truffle Burger \+2,00/)).toBeTruthy();
    expect(screen.getByText(/Side:/)).toBeTruthy();
    expect(screen.getByText(/Patatas Bravas \+1,00/)).toBeTruthy();
    expect(screen.getByText(/Drink:/)).toBeTruthy();
    expect(screen.getByText(/Water/)).toBeTruthy();
  });

  it('renders platter included components on order lines', async () => {
    const i18n = provideI18nTesting();
    const platterOrder: TableOrder = {
      ...order,
      total: 12.9,
      lines: [
        {
          id: 'line-platter',
          productSnapshot: {
            ...productSnapshot('product-17', 'Plato combinado de lomo', 12.9, 'main'),
            productType: 'platter',
          },
          productId: 'product-17',
          productName: 'Plato combinado de lomo',
          quantity: 1,
          basePrice: 12.9,
          selectedModifiers: [],
          platterComponents: [
            { id: 'platter-loin', name: 'Lomo', quantity: 1, removable: false, replaceable: false },
            { id: 'platter-egg', name: 'Huevo', quantity: 1, removable: true, replaceable: false },
            { id: 'platter-fries', name: 'Patatas', quantity: 1, removable: true, replaceable: false },
            { id: 'platter-salad', name: 'Ensalada', quantity: 1, removable: true, replaceable: false },
          ],
          unitPrice: 12.9,
          subtotal: 12.9,
          configurationSignature: 'product-17::',
          course: 'main',
          status: 'pending',
        },
      ],
    };

    await render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        serviceInfo: createServiceInfo(table, platterOrder),
        title: 'Mesa 1',
        errorMessage: null,
      },
    });

    expect(screen.getByText('1 x Plato combinado de lomo')).toBeTruthy();
    expect(screen.getByText(/Incluye:/)).toBeTruthy();
    expect(screen.getByText(/lomo, huevo, patatas, ensalada/)).toBeTruthy();
  });

  it('keeps line preparation compact while preserving removal and notes', async () => {
    const i18n = provideI18nTesting();
    const removeProduct = vi.fn();
    const updateProductNote = vi.fn();
    const kitchenOrder: TableOrder = {
      ...order,
      lines: [
        {
          ...order.lines[0],
          status: 'sent_to_kitchen',
          kitchenNote: 'Sin cebolla',
          note: 'Sin cebolla',
        },
      ],
    };

    const { fixture } = await render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        serviceInfo: createServiceInfo(table, kitchenOrder, {
          canSendToKitchen: false,
          canMarkServed: true,
        }),
        title: 'Mesa 1',
        errorMessage: null,
      },
    });
    fixture.componentInstance.removeProduct.subscribe(removeProduct);
    fixture.componentInstance.updateProductNote.subscribe(updateProductNote);

    expect(screen.getByText('En cocina')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Marcar Craft Burger como preparado' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Marcar Craft Burger como servido' })).toBeNull();

    fireEvent.input(screen.getByRole('textbox', { name: 'Nota para Craft Burger' }), { target: { value: 'Muy hecho' } });
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Craft Burger del pedido' }));

    const dialog = screen.getByRole('dialog', { name: 'Cancelar producto de cocina' });
    expect(dialog).toBeTruthy();
    expect(removeProduct).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Cancelar producto' })[1]);

    expect(updateProductNote).toHaveBeenCalledWith({ lineId: 'line-burger', note: 'Muy hecho' });
    expect(removeProduct).not.toHaveBeenCalled();
  });

  it('confirms removal when the line is no longer pending', async () => {
    const i18n = provideI18nTesting();
    const removeProduct = vi.fn();
    const kitchenOrder: TableOrder = {
      ...order,
      lines: [
        {
          ...order.lines[0],
          status: 'ready',
        },
      ],
    };

    const { fixture } = await render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        serviceInfo: createServiceInfo(table, kitchenOrder, {
          canSendToKitchen: false,
          canMarkServed: true,
        }),
        title: 'Mesa 1',
        errorMessage: null,
      },
    });
    fixture.componentInstance.removeProduct.subscribe(removeProduct);

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Craft Burger del pedido' }));

    const dialog = screen.getByRole('dialog', { name: 'Cancelar producto de cocina' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sí, cancelar producto' }));

    expect(removeProduct).toHaveBeenCalledWith('line-burger');
  });

  it('removes pending lines without confirmation', async () => {
    const { fixture } = await renderServiceTablePanel();
    const removeProduct = vi.fn();
    fixture.componentInstance.removeProduct.subscribe(removeProduct);

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Craft Burger del pedido' }));

    expect(screen.queryByRole('dialog', { name: 'Cancelar producto de cocina' })).toBeNull();
    expect(removeProduct).toHaveBeenCalledWith('line-burger');
  });

  it('shows picked up line status without preparation controls', async () => {
    const i18n = provideI18nTesting();
    const pickedUpOrder: TableOrder = {
      ...order,
      lines: [
        {
          ...order.lines[0],
          status: 'picked_up',
          pickedUpAt: '2026-06-10T12:20:00.000Z',
        },
      ],
    };

    await render(ServiceTablePanel, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        serviceInfo: createServiceInfo(table, pickedUpOrder, {
          canSendToKitchen: false,
          canMarkServed: true,
        }),
        title: 'Mesa 1',
        errorMessage: null,
      },
    });

    expect(screen.getByText('Recogido')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Marcar Craft Burger como servido' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Marcar Craft Burger como preparado' })).toBeNull();
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
