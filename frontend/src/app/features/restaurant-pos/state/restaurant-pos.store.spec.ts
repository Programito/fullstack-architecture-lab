import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { RestaurantPosStore } from './restaurant-pos.store';

describe('RestaurantPosStore', () => {
  let store: RestaurantPosStore;

  beforeEach(() => {
    const i18n = provideI18nTesting('en');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [...i18n.imports],
      providers: [...i18n.providers],
    });
    store = TestBed.inject(RestaurantPosStore);
  });

  it('creates the initial state correctly', () => {
    expect(store.gridRows()).toBe(20);
    expect(store.gridColumns()).toBe(20);
    expect(store.floorElements().length).toBeGreaterThan(0);
    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(
      expect.objectContaining({ x: 1, y: 1, width: 2, height: 2 }),
    );
    expect(store.floorElements().find((element) => element.id === 'floor-element-2')).toEqual(
      expect.objectContaining({ x: 5, y: 1, width: 2, height: 2 }),
    );
    expect(store.restaurantTables().length).toBeGreaterThan(0);
    expect(store.floorElements().find((element) => element.id === 'floor-element-6')).toEqual(
      expect.objectContaining({ type: 'stool', tableId: 'stool-1' }),
    );
    expect(store.restaurantTables().find((table) => table.id === 'stool-1')).toEqual(
      expect.objectContaining({ capacity: 1, status: 'free', total: 0 }),
    );
    expect(store.products().length).toBeGreaterThan(0);
    expect(store.selectedTableId()).toBeNull();
    expect(store.mode()).toBe('operation');
    expect(store.errorMessage()).toBeNull();
  });

  it('sets the selected table', () => {
    store.selectTable('table-1');

    expect(store.selectedTableId()).toBe('table-1');
    expect(store.errorMessage()).toBeNull();
  });

  it('hydrates the service floor and resets visible service orders', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');

    store.hydrateServiceFloor({
      floorId: 'floor-main',
      floorName: 'Sala principal',
      rows: 12,
      columns: 16,
      floorElements: [
        { id: 'service-element-1', type: 'table', label: 'M1', x: 1, y: 1, width: 2, height: 2, tableId: 'table-1' },
        { id: 'service-element-2', type: 'stool', label: 'Stool 1', x: 4, y: 1, width: 1, height: 1, tableId: 'stool-1' },
      ],
      restaurantTables: [
        { id: 'table-1', number: 1, capacity: 2, status: 'free', total: 0, openDuration: '0m' },
        { id: 'stool-1', number: 2, capacity: 1, status: 'occupied', total: 4.5, openDuration: '5m' },
      ],
    });

    expect(store.activeFloorId()).toBe('floor-main');
    expect(store.gridRows()).toBe(12);
    expect(store.gridColumns()).toBe(16);
    expect(store.floorElements()).toEqual([
      expect.objectContaining({ id: 'service-element-1', tableId: 'table-1' }),
      expect.objectContaining({ id: 'service-element-2', tableId: 'stool-1', type: 'stool' }),
    ]);
    expect(store.restaurantTables()).toEqual([
      expect.objectContaining({ id: 'table-1', status: 'free' }),
      expect.objectContaining({ id: 'stool-1', status: 'occupied', total: 4.5 }),
    ]);
    expect(store.ordersByTable()['table-1']).toEqual(expect.objectContaining({ tableId: 'table-1', lines: [], total: 0 }));
    expect(store.ordersByTable()['stool-1']).toEqual(expect.objectContaining({ tableId: 'stool-1', lines: [], total: 0 }));
    expect(store.selectedTableId()).toBe('table-1');
  });

  it('hydrates one service point detail and its backend order', () => {
    store.hydrateServiceFloor({
      floorId: 'floor-main',
      floorName: 'Sala principal',
      rows: 12,
      columns: 16,
      floorElements: [{ id: 'service-element-1', type: 'table', label: 'M1', x: 1, y: 1, width: 2, height: 2, tableId: 'table-1' }],
      restaurantTables: [{ id: 'table-1', number: 1, capacity: 2, status: 'free', total: 0, openDuration: '0m' }],
    });
    store.selectTable('table-1');

    store.hydrateServicePoint({
      table: {
        id: 'table-1',
        number: 1,
        capacity: 4,
        status: 'waiting_kitchen',
        total: 14,
        openDuration: '18m',
        occupiedAt: '2026-06-22T10:00:00.000Z',
        serviceStartedAt: '2026-06-22T10:00:00.000Z',
      },
      floorElement: {
        id: 'service-element-1',
        type: 'table',
        label: 'Mesa ventana',
        x: 2,
        y: 3,
        width: 2,
        height: 2,
        tableId: 'table-1',
        shape: 'round',
      },
    });
    store.hydrateServicePointOrder('table-1', {
      tableId: 'table-1',
      total: 14,
      status: 'sent_to_kitchen',
      paymentMethod: 'pending',
      lines: [
        {
          id: 'line-1',
          productSnapshot: {
            productId: 'service-product:line-1',
            productName: 'Hamburguesa craft',
            productType: 'simple',
            basePrice: 14,
            course: 'main',
            preparationPolicy: { route: 'kitchen', requiresReadyBeforeServe: true },
          },
          productId: 'service-product:line-1',
          productName: 'Hamburguesa craft',
          quantity: 1,
          basePrice: 14,
          selectedModifiers: [],
          unitPrice: 14,
          subtotal: 14,
          configurationSignature: 'service-line:line-1',
          course: 'main',
          status: 'sent_to_kitchen',
        },
      ],
    });

    expect(store.selectedTable()).toEqual(expect.objectContaining({ capacity: 4, status: 'waiting_kitchen', total: 14 }));
    expect(store.floorElements()[0]).toEqual(expect.objectContaining({ label: 'Mesa ventana', x: 2, y: 3, shape: 'round' }));
    expect(store.selectedOrder()).toEqual(
      expect.objectContaining({
        tableId: 'table-1',
        status: 'sent_to_kitchen',
        total: 14,
        lines: [expect.objectContaining({ productName: 'Hamburguesa craft', status: 'sent_to_kitchen' })],
      }),
    );
  });

  it('derives service info for a selected table even when its order is missing', () => {
    store.selectTable('table-1');
    (store as unknown as { _ordersByTable: { set: (orders: Record<string, never>) => void } })._ordersByTable.set({});

    expect(store.selectedServiceInfo()).toEqual(
      expect.objectContaining({
        table: expect.objectContaining({ id: 'table-1' }),
        order: expect.objectContaining({ tableId: 'table-1', lines: [], total: 0, status: 'open' }),
        servicePhase: { course: null, status: 'no_order' },
        nextAction: { type: 'none', count: 0 },
      }),
    );
  });

  it('derives selected service info and service points from private state', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-3');
    store.addProductToSelectedTable('product-1');

    const serviceInfo = store.selectedServiceInfo();

    expect(serviceInfo).toEqual(
      expect.objectContaining({
        table: expect.objectContaining({ id: 'table-1', status: 'occupied', total: 17 }),
        order: expect.objectContaining({ tableId: 'table-1', total: 17 }),
        pendingKitchenCount: 2,
        servicePhase: { course: 'drinks', status: 'pending' },
        nextAction: { type: 'send_kitchen', count: 2 },
        canSendToKitchen: true,
        canMarkServed: true,
        canCharge: true,
        canMarkCleaning: true,
        canFreeTable: false,
      }),
    );
    expect(serviceInfo?.courseGroups).toEqual([
      expect.objectContaining({ course: 'drinks', quantity: 1, total: 4.5 }),
      expect.objectContaining({ course: 'main', quantity: 1, total: 12.5 }),
    ]);
    expect(store.servicePoints().find((servicePoint) => servicePoint.table.id === 'table-1')).toEqual(
      expect.objectContaining({
        element: expect.objectContaining({ tableId: 'table-1' }),
        table: expect.objectContaining({ id: 'table-1' }),
      }),
    );
  });

  it('counts occupied service points from the visible floor plan only', () => {
    expect(store.servicePoints().length).toBe(5);
    expect(store.occupiedTables()).toBe(0);

    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');

    expect(store.occupiedTables()).toBe(1);
  });

  it('sets the full grid size when the value is valid', () => {
    store.setGridSize(9, 10);

    expect(store.gridRows()).toBe(9);
    expect(store.gridColumns()).toBe(10);
    expect(store.errorMessage()).toBeNull();
  });

  it('prevents setting a grid size smaller than one', () => {
    store.setGridSize(0, 6);

    expect(store.gridRows()).toBe(20);
    expect(store.gridColumns()).toBe(20);
    expect(store.errorMessage()).toBe('restaurantPos.errors.cannotResizeGrid');
  });

  it('prevents setting a grid size that would leave elements outside bounds', () => {
    store.setGridSize(4, 4);

    expect(store.gridRows()).toBe(20);
    expect(store.gridColumns()).toBe(20);
    expect(store.errorMessage()).toBe('restaurantPos.errors.cannotResizeGrid');
  });

  it('adds a product to the selected table order', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');

    const order = store.ordersByTable()['table-1'];
    const table = store.restaurantTables().find((restaurantTable) => restaurantTable.id === 'table-1');

    expect(order.lines).toEqual([
      expect.objectContaining({
        id: expect.any(String),
        productId: 'product-1',
        productName: 'Craft Burger',
        productSnapshot: expect.objectContaining({
          productId: 'product-1',
          productName: 'Craft Burger',
          productType: 'simple',
          basePrice: 12.5,
          course: 'main',
          preparationPolicy: { route: 'kitchen', requiresReadyBeforeServe: true },
        }),
        quantity: 1,
        basePrice: 12.5,
        selectedModifiers: expect.arrayContaining([expect.objectContaining({ optionId: 'point-medium' })]),
        unitPrice: 12.5,
        subtotal: 12.5,
        configurationSignature: expect.any(String),
        course: 'main',
        status: 'pending',
      }),
    ]);
    expect(order.total).toBe(12.5);
    expect(table?.total).toBe(12.5);
    expect(table?.status).toBe('occupied');
    expect(table?.occupiedAt).toBeTruthy();
    expect(table?.serviceStartedAt).toBeTruthy();
  });

  it('keeps order line product snapshots stable when catalog text changes', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');

    TestBed.inject(TranslocoService).setActiveLang('es');

    const [line] = store.ordersByTable()['table-1'].lines;

    expect(store.products().find((product) => product.id === 'product-1')?.name).toBe('Hamburguesa craft');
    expect(line.productName).toBe('Craft Burger');
    expect(line.productSnapshot.productName).toBe('Craft Burger');
  });

  it('occupies the selected table and records service timestamps', () => {
    store.selectTable('table-1');
    store.occupySelectedTable();

    const table = store.restaurantTables().find((restaurantTable) => restaurantTable.id === 'table-1');

    expect(table?.status).toBe('occupied');
    expect(table?.occupiedAt).toBeTruthy();
    expect(table?.serviceStartedAt).toBeTruthy();
    expect(table?.cleaningStartedAt).toBeUndefined();
  });

  it('increases quantity when the product already exists in the order', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.addProductToSelectedTable('product-1');

    const [line] = store.ordersByTable()['table-1'].lines;

    expect(line.quantity).toBe(2);
    expect(line.subtotal).toBe(25);
    expect(store.ordersByTable()['table-1'].total).toBe(25);
  });

  it('adds customized products as snapshots and merges identical configurations', () => {
    store.selectTable('table-1');
    store.addCustomizedProductToSelectedTable('product-1', ['point-medium', 'extra-bacon', 'remove-onion'], 'Little done');
    store.addCustomizedProductToSelectedTable('product-1', ['remove-onion', 'extra-bacon', 'point-medium'], 'Little done');

    const [line] = store.ordersByTable()['table-1'].lines;

    expect(line).toEqual(
      expect.objectContaining({
        productName: 'Craft Burger',
        productSnapshot: expect.objectContaining({
          productId: 'product-1',
          productName: 'Craft Burger',
          productType: 'simple',
          preparationPolicy: { route: 'kitchen', requiresReadyBeforeServe: true },
        }),
        quantity: 2,
        basePrice: 12.5,
        unitPrice: 14,
        subtotal: 28,
        kitchenNote: 'Little done',
        selectedModifiers: expect.arrayContaining([
          expect.objectContaining({ name: 'Bacon', priceDelta: 1.5 }),
          expect.objectContaining({ name: 'Onion', type: 'remove', priceDelta: 0 }),
        ]),
      }),
    );
    expect(store.ordersByTable()['table-1'].total).toBe(28);
  });

  it('keeps different modifiers and kitchen notes as separate order lines', () => {
    store.selectTable('table-1');
    store.addCustomizedProductToSelectedTable('product-1', ['point-medium', 'extra-bacon'], 'Little done');
    store.addCustomizedProductToSelectedTable('product-1', ['point-medium', 'extra-cheese'], 'Little done');
    store.addCustomizedProductToSelectedTable('product-1', ['point-medium', 'extra-bacon'], 'No salt');

    expect(store.ordersByTable()['table-1'].lines).toHaveLength(3);
    expect(store.ordersByTable()['table-1'].lines.map((line) => line.configurationSignature)).toHaveLength(3);
    expect(new Set(store.ordersByTable()['table-1'].lines.map((line) => line.configurationSignature)).size).toBe(3);
  });

  it('sets an error when adding a configured combo without a selected table', () => {
    store.addConfiguredComboToSelectedTable('product-16', [
      { slotId: 'combo-burger', selectedProductIds: ['product-12'] },
      { slotId: 'combo-side', selectedProductIds: ['product-13'] },
      { slotId: 'combo-drink', selectedProductIds: ['product-14'] },
    ]);

    expect(store.errorMessage()).toBe('restaurantPos.errors.selectTableFirst');
  });

  it('adds configured combo snapshots and calculates supplements', () => {
    store.selectTable('table-1');
    store.addConfiguredComboToSelectedTable('product-16', [
      { slotId: 'combo-burger', selectedProductIds: ['product-7'] },
      { slotId: 'combo-side', selectedProductIds: ['product-9'] },
      { slotId: 'combo-drink', selectedProductIds: ['product-10'] },
    ]);

    const [line] = store.ordersByTable()['table-1'].lines;

    expect(line).toEqual(
      expect.objectContaining({
        productId: 'product-16',
        productName: 'Classic Burger Menu',
        productSnapshot: expect.objectContaining({
          productId: 'product-16',
          productName: 'Classic Burger Menu',
          productType: 'combo',
          preparationPolicy: { route: 'kitchen', requiresReadyBeforeServe: true },
        }),
        quantity: 1,
        basePrice: 13.5,
        unitPrice: 16.5,
        subtotal: 16.5,
        selectedModifiers: [],
        selectedComboSlots: [
          expect.objectContaining({
            slotName: 'Burger',
            selectedProducts: [expect.objectContaining({ productName: 'Truffle Burger', course: 'main', preparationPolicy: { route: 'kitchen', requiresReadyBeforeServe: true }, supplementPrice: 2 })],
          }),
          expect.objectContaining({
            slotName: 'Side',
            selectedProducts: [expect.objectContaining({ productName: 'Patatas Bravas', course: 'starter', preparationPolicy: { route: 'kitchen', requiresReadyBeforeServe: true }, supplementPrice: 1 })],
          }),
          expect.objectContaining({
            slotName: 'Drink',
            selectedProducts: [expect.objectContaining({ productName: 'Water', course: 'drinks', preparationPolicy: { route: 'bar', requiresReadyBeforeServe: false }, supplementPrice: 0 })],
          }),
        ],
      }),
    );
    expect(store.ordersByTable()['table-1'].total).toBe(16.5);
    expect(store.restaurantTables().find((table) => table.id === 'table-1')?.total).toBe(16.5);
  });

  it('keeps platter components as snapshot data in order lines', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-17');

    const [line] = store.ordersByTable()['table-1'].lines;

    expect(line).toEqual(
      expect.objectContaining({
        productId: 'product-17',
        productName: 'Pork Loin Platter',
        productSnapshot: expect.objectContaining({
          productId: 'product-17',
          productName: 'Pork Loin Platter',
          productType: 'platter',
          preparationPolicy: { route: 'kitchen', requiresReadyBeforeServe: true },
        }),
        quantity: 1,
        basePrice: 12.9,
        unitPrice: 12.9,
        subtotal: 12.9,
        selectedModifiers: [],
        platterComponents: [
          expect.objectContaining({ id: 'platter-loin', name: 'Lomo', removable: false, replaceable: false }),
          expect.objectContaining({ id: 'platter-egg', name: 'Huevo', removable: true, replaceable: false }),
          expect.objectContaining({ id: 'platter-fries', name: 'Patatas fritas', removable: true, replaceable: false }),
          expect.objectContaining({ id: 'platter-salad', name: 'Ensalada', removable: true, replaceable: false }),
        ],
      }),
    );
    expect(line.selectedComboSlots).toBeUndefined();
  });

  it('merges identical combo configurations and separates different ones', () => {
    store.selectTable('table-1');
    const firstSelection = [
      { slotId: 'combo-burger', selectedProductIds: ['product-7'] },
      { slotId: 'combo-side', selectedProductIds: ['product-9'] },
      { slotId: 'combo-drink', selectedProductIds: ['product-10'] },
    ];
    const secondSelection = [
      { slotId: 'combo-burger', selectedProductIds: ['product-12'] },
      { slotId: 'combo-side', selectedProductIds: ['product-9'] },
      { slotId: 'combo-drink', selectedProductIds: ['product-10'] },
    ];

    store.addConfiguredComboToSelectedTable('product-16', firstSelection);
    store.addConfiguredComboToSelectedTable('product-16', [...firstSelection].reverse());
    store.addConfiguredComboToSelectedTable('product-16', secondSelection);

    expect(store.ordersByTable()['table-1'].lines).toHaveLength(2);
    expect(store.ordersByTable()['table-1'].lines[0]).toEqual(expect.objectContaining({ quantity: 2, subtotal: 33 }));
    expect(store.ordersByTable()['table-1'].lines[1]).toEqual(expect.objectContaining({ quantity: 1, subtotal: 14.5 }));
    expect(store.ordersByTable()['table-1'].total).toBe(47.5);
  });

  it('does not add customized products when validation fails', () => {
    store.selectTable('table-1');
    store.addCustomizedProductToSelectedTable('product-1', ['extra-bacon']);

    expect(store.ordersByTable()['table-1'].lines).toEqual([]);
    expect(store.errorMessage()).toBe('restaurantPos.errors.productUnavailable');
  });

  it('decreases quantity and removes the line when it reaches zero', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.addProductToSelectedTable('product-1');

    store.decreaseSelectedOrderLine('product-1');

    expect(store.ordersByTable()['table-1'].lines[0]).toEqual(expect.objectContaining({ quantity: 1, subtotal: 12.5 }));
    expect(store.ordersByTable()['table-1'].total).toBe(12.5);
    expect(store.restaurantTables().find((table) => table.id === 'table-1')?.total).toBe(12.5);

    store.decreaseSelectedOrderLine('product-1');

    expect(store.ordersByTable()['table-1'].lines).toEqual([]);
    expect(store.ordersByTable()['table-1'].total).toBe(0);
    expect(store.restaurantTables().find((table) => table.id === 'table-1')?.total).toBe(0);
  });

  it('sets an error when adding a product without a selected table', () => {
    store.addProductToSelectedTable('product-1');

    expect(store.errorMessage()).toBe('restaurantPos.errors.selectTableFirst');
  });

  it('does not add unavailable products', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-4');

    expect(store.ordersByTable()['table-1'].lines).toEqual([]);
    expect(store.errorMessage()).toBe('restaurantPos.errors.productUnavailable');
  });

  it('sends the selected order to kitchen', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.sendSelectedOrderToKitchen();

    const table = store.restaurantTables().find((restaurantTable) => restaurantTable.id === 'table-1');

    expect(table?.status).toBe('waiting_kitchen');
    expect(store.ordersByTable()['table-1'].status).toBe('sent_to_kitchen');
    expect(store.ordersByTable()['table-1'].lines[0].status).toBe('sent_to_kitchen');
    expect(store.ordersByTable()['table-1'].lines[0].sentToKitchenAt).toBeTruthy();
  });

  it('marks the selected order as served', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.sendSelectedOrderToKitchen();
    store.markSelectedOrderAsServed();

    const table = store.restaurantTables().find((restaurantTable) => restaurantTable.id === 'table-1');

    expect(table?.status).toBe('served');
    expect(store.ordersByTable()['table-1'].status).toBe('served');
    expect(store.ordersByTable()['table-1'].lines[0].status).toBe('served');
    expect(store.ordersByTable()['table-1'].lines[0].servedAt).toBeTruthy();
  });

  it('marks one selected order line as ready and then served', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.addProductToSelectedTable('product-3');
    store.sendSelectedOrderToKitchen();

    store.markSelectedOrderLineReady('product-1');

    expect(store.ordersByTable()['table-1'].lines.find((line) => line.productId === 'product-1')).toEqual(
      expect.objectContaining({ status: 'ready', readyAt: expect.any(String) }),
    );
    expect(store.ordersByTable()['table-1'].lines.find((line) => line.productId === 'product-3')).toEqual(
      expect.objectContaining({ status: 'sent_to_kitchen' }),
    );
    expect(store.selectedServiceInfo()?.canMarkServed).toBe(true);

    store.markSelectedOrderLineServed('product-1');

    expect(store.ordersByTable()['table-1'].lines.find((line) => line.productId === 'product-1')).toEqual(
      expect.objectContaining({ status: 'served', servedAt: expect.any(String) }),
    );
    expect(store.restaurantTables().find((table) => table.id === 'table-1')?.status).toBe('waiting_kitchen');
  });

  it('moves kitchen lines through preparing and ready states', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.addProductToSelectedTable('product-3');
    store.sendSelectedOrderToKitchen();

    store.markOrderLinePreparing('table-1', 'product-1');

    expect(store.ordersByTable()['table-1'].lines.find((line) => line.productId === 'product-1')).toEqual(
      expect.objectContaining({ status: 'preparing', preparingAt: expect.any(String) }),
    );
    expect(store.ordersByTable()['table-1'].lines.find((line) => line.productId === 'product-3')).toEqual(
      expect.objectContaining({ status: 'sent_to_kitchen' }),
    );

    store.markOrderLineReady('table-1', 'product-1');

    expect(store.ordersByTable()['table-1'].lines.find((line) => line.productId === 'product-1')).toEqual(
      expect.objectContaining({ status: 'ready', readyAt: expect.any(String) }),
    );
  });

  it('archives ready kitchen lines without marking them as served', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.addProductToSelectedTable('product-3');
    store.sendSelectedOrderToKitchen();
    store.markOrderLineReady('table-1', 'product-1');

    store.archiveOrderLineFromKitchen('table-1', 'product-1');
    store.archiveOrderLineFromKitchen('table-1', 'product-3');

    const archivedLine = store.ordersByTable()['table-1'].lines.find((line) => line.productId === 'product-1');

    expect(archivedLine).toEqual(expect.objectContaining({ status: 'picked_up', pickedUpAt: expect.any(String) }));
    expect(archivedLine).not.toHaveProperty('servedAt');
    const queuedLine = store.ordersByTable()['table-1'].lines.find((line) => line.productId === 'product-3');

    expect(queuedLine).toEqual(expect.objectContaining({ status: 'sent_to_kitchen' }));
    expect(queuedLine).not.toHaveProperty('pickedUpAt');
    expect(store.kitchenTickets().flatMap((ticket) => ticket.lines).map((line) => line.productId)).toEqual(['product-3']);
    expect(store.selectedServiceInfo()?.canMarkServed).toBe(true);

    store.markSelectedOrderLineServed('product-1');

    expect(store.ordersByTable()['table-1'].lines.find((line) => line.productId === 'product-1')).toEqual(
      expect.objectContaining({ status: 'served', servedAt: expect.any(String), pickedUpAt: expect.any(String) }),
    );
  });

  it('moves kitchen lines back one phase without changing queued, picked up, or served lines', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.addProductToSelectedTable('product-3');
    store.sendSelectedOrderToKitchen();
    store.markOrderLinePreparing('table-1', 'product-1');
    store.markOrderLineReady('table-1', 'product-1');

    store.moveOrderLineBackInKitchen('table-1', 'product-1');

    expect(store.ordersByTable()['table-1'].lines.find((line) => line.productId === 'product-1')).toEqual(
      expect.objectContaining({ status: 'preparing', readyAt: undefined }),
    );

    store.moveOrderLineBackInKitchen('table-1', 'product-1');
    store.moveOrderLineBackInKitchen('table-1', 'product-3');

    expect(store.ordersByTable()['table-1'].lines.find((line) => line.productId === 'product-1')).toEqual(
      expect.objectContaining({ status: 'sent_to_kitchen', preparingAt: undefined }),
    );
    expect(store.ordersByTable()['table-1'].lines.find((line) => line.productId === 'product-3')).toEqual(
      expect.objectContaining({ status: 'sent_to_kitchen' }),
    );

    store.markOrderLineReady('table-1', 'product-1');
    store.archiveOrderLineFromKitchen('table-1', 'product-1');
    store.moveOrderLineBackInKitchen('table-1', 'product-1');

    expect(store.ordersByTable()['table-1'].lines.find((line) => line.productId === 'product-1')).toEqual(
      expect.objectContaining({ status: 'picked_up' }),
    );

    store.markSelectedOrderAsServed();
    store.moveOrderLineBackInKitchen('table-1', 'product-1');

    expect(store.ordersByTable()['table-1'].lines.find((line) => line.productId === 'product-1')).toEqual(
      expect.objectContaining({ status: 'served' }),
    );
  });

  it('groups kitchen board columns by line phase and table', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.addProductToSelectedTable('product-3');
    store.sendSelectedOrderToKitchen();
    store.markOrderLinePreparing('table-1', 'product-1');

    const queuedColumn = store.kitchenBoardColumns().find((column) => column.status === 'sent_to_kitchen');
    const preparingColumn = store.kitchenBoardColumns().find((column) => column.status === 'preparing');

    expect(queuedColumn?.tickets[0]).toEqual(
      expect.objectContaining({
        table: expect.objectContaining({ id: 'table-1' }),
        lines: [expect.objectContaining({ productId: 'product-3' })],
      }),
    );
    expect(preparingColumn?.tickets[0]).toEqual(
      expect.objectContaining({
        table: expect.objectContaining({ id: 'table-1' }),
        lines: [expect.objectContaining({ productId: 'product-1' })],
      }),
    );
  });

  it('groups preparation board cards by status', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.addProductToSelectedTable('product-3');
    store.sendSelectedOrderToKitchen();

    const pendingColumn = store.preparationBoardColumns().find((column) => column.id === 'pending');

    expect(pendingColumn?.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tableId: 'table-1', tableNumber: 1, line: expect.objectContaining({ productId: 'product-1' }) }),
        expect.objectContaining({ tableId: 'table-1', tableNumber: 1, line: expect.objectContaining({ productId: 'product-3' }) }),
      ]),
    );
  });

  it('moves a pending preparation line to preparing', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.sendSelectedOrderToKitchen();

    const result = store.movePreparationLine('table-1', 'product-1', 'preparing');

    expect(result).toEqual({ moved: true });
    expect(store.ordersByTable()['table-1'].lines[0]).toEqual(expect.objectContaining({ status: 'preparing', preparingAt: expect.any(String) }));
    expect(store.preparationBoardColumns().find((c) => c.id === 'preparing')?.cards).toEqual(
      expect.arrayContaining([expect.objectContaining({ line: expect.objectContaining({ productId: 'product-1' }) })]),
    );
  });

  it('reverts a preparing line back to pending', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.sendSelectedOrderToKitchen();
    store.movePreparationLine('table-1', 'product-1', 'preparing');

    const result = store.movePreparationLine('table-1', 'product-1', 'pending');

    expect(result).toEqual({ moved: true });
    expect(store.ordersByTable()['table-1'].lines[0].status).toBe('sent_to_kitchen');
    expect(store.preparationBoardColumns().find((c) => c.id === 'pending')?.cards).toEqual(
      expect.arrayContaining([expect.objectContaining({ line: expect.objectContaining({ productId: 'product-1' }) })]),
    );
  });

  it('exposes served lines in servedPreparationCards', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.sendSelectedOrderToKitchen();
    store.movePreparationLine('table-1', 'product-1', 'ready');
    store.markSelectedOrderLineServed('product-1');

    expect(store.servedPreparationCards()).toEqual(
      expect.arrayContaining([expect.objectContaining({ line: expect.objectContaining({ productId: 'product-1', status: 'served' }) })]),
    );
  });

  it('cancels a served preparation line and removes it from served cards', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.sendSelectedOrderToKitchen();
    store.movePreparationLine('table-1', 'product-1', 'ready');
    store.markSelectedOrderLineServed('product-1');

    store.cancelPreparationLine('table-1', 'product-1');

    expect(store.ordersByTable()['table-1'].lines[0].status).toBe('cancelled');
    expect(store.servedPreparationCards()).toEqual([]);
  });


  it('removes an order line and keeps order totals in sync', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.addProductToSelectedTable('product-3');

    store.removeSelectedOrderLine('product-1');

    expect(store.ordersByTable()['table-1'].lines.map((line) => line.productId)).toEqual(['product-3']);
    expect(store.ordersByTable()['table-1'].total).toBe(4.5);
    expect(store.restaurantTables().find((table) => table.id === 'table-1')?.total).toBe(4.5);
  });

  it('updates and clears a note on a selected order line', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');

    store.updateSelectedOrderLineNote('product-1', 'Sin cebolla');

    expect(store.ordersByTable()['table-1'].lines[0].note).toBe('Sin cebolla');

    store.updateSelectedOrderLineNote('product-1', '   ');

    expect(store.ordersByTable()['table-1'].lines[0].note).toBeUndefined();
  });

  it('marks the selected table as paid when charging is accepted', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.chargeSelectedTable();

    const table = store.restaurantTables().find((restaurantTable) => restaurantTable.id === 'table-1');

    expect(table?.status).toBe('paid');
    expect(store.ordersByTable()['table-1'].status).toBe('paid');
  });

  it('can mark the selected table payment as pending before completion', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.markSelectedPaymentPending();

    const table = store.restaurantTables().find((restaurantTable) => restaurantTable.id === 'table-1');

    expect(table?.status).toBe('payment_pending');
    expect(store.ordersByTable()['table-1'].status).toBe('payment_pending');
  });

  it('lets a selected stool work as a one-person service point', () => {
    store.selectTable('stool-1');
    store.addProductToSelectedTable('product-3');

    const stool = store.restaurantTables().find((restaurantTable) => restaurantTable.id === 'stool-1');
    const order = store.ordersByTable()['stool-1'];

    expect(stool).toEqual(
      expect.objectContaining({
        capacity: 1,
        status: 'occupied',
        total: 4.5,
      }),
    );
    expect(order.lines[0]).toEqual(expect.objectContaining({ productName: 'Sparkling Lemonade', quantity: 1 }));
    expect(order.total).toBe(4.5);
  });

  it('frees the selected table', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.freeSelectedTable();

    const table = store.restaurantTables().find((restaurantTable) => restaurantTable.id === 'table-1');
    const order = store.ordersByTable()['table-1'];

    expect(order.lines).toEqual([]);
    expect(order.total).toBe(0);
    expect(order.status).toBe('open');
    expect(table?.total).toBe(0);
    expect(table?.status).toBe('free');
    expect(table?.occupiedAt).toBeUndefined();
    expect(table?.serviceStartedAt).toBeUndefined();
  });

  it('marks the selected table for cleaning', () => {
    store.selectTable('table-1');
    store.addProductToSelectedTable('product-1');
    store.markSelectedTableForCleaning();

    const table = store.restaurantTables().find((restaurantTable) => restaurantTable.id === 'table-1');

    expect(table?.status).toBe('cleaning');
    expect(table?.cleaningStartedAt).toBeTruthy();
  });

  it('adds a valid floor element', () => {
    const initialCount = store.floorElements().length;

    store.addFloorElement({
      type: 'blocked',
      label: 'Maintenance',
      x: 5,
      y: 5,
      width: 1,
      height: 1,
    });

    expect(store.floorElements().length).toBe(initialCount + 1);
    expect(store.floorElements().at(-1)).toEqual(
      expect.objectContaining({
        type: 'blocked',
        label: 'Maintenance',
        x: 5,
        y: 5,
        width: 1,
        height: 1,
      }),
    );
  });

  it('prevents overlapping floor elements', () => {
    const initialCount = store.floorElements().length;

    store.addFloorElement({
      type: 'blocked',
      label: 'Overlap',
      x: 1,
      y: 1,
      width: 1,
      height: 1,
    });

    expect(store.floorElements().length).toBe(initialCount);
    expect(store.errorMessage()).toBe('restaurantPos.errors.cannotPlaceElement');
  });

  it('prevents floor elements outside the grid', () => {
    const initialCount = store.floorElements().length;

    store.addFloorElement({
      type: 'blocked',
      label: 'Outside',
      x: 20,
      y: 0,
      width: 1,
      height: 1,
    });

    expect(store.floorElements().length).toBe(initialCount);
    expect(store.errorMessage()).toBe('restaurantPos.errors.cannotPlaceElement');
  });

  it('creates a floor element and restaurant table when adding a table element', () => {
    const initialElementCount = store.floorElements().length;
    const initialTableCount = store.restaurantTables().length;

    store.addFloorElement({
      type: 'table',
      label: 'Table 99',
      x: 4,
      y: 4,
      width: 1,
      height: 1,
    });

    const element = store.floorElements().at(-1);
    const table = store.restaurantTables().find((restaurantTable) => restaurantTable.id === element?.tableId);

    expect(store.floorElements().length).toBe(initialElementCount + 1);
    expect(store.restaurantTables().length).toBe(initialTableCount + 1);
    expect(element?.type).toBe('table');
    expect(element?.tableId).toBeTruthy();
    expect(table).toEqual(
      expect.objectContaining({
        status: 'free',
        total: 0,
      }),
    );
  });

  it('adds a table in the first available grid space', () => {
    const initialElementCount = store.floorElements().length;
    const initialTableCount = store.restaurantTables().length;

    store.addTable(1, 1);

    const element = store.floorElements().at(-1);
    const table = store.restaurantTables().find((restaurantTable) => restaurantTable.id === element?.tableId);

    expect(store.floorElements().length).toBe(initialElementCount + 1);
    expect(store.restaurantTables().length).toBe(initialTableCount + 1);
    expect(element).toEqual(
      expect.objectContaining({
        type: 'table',
        label: 'M8',
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        tableId: 'table-8',
      }),
    );
    expect(table).toEqual(
      expect.objectContaining({
        id: 'table-8',
        number: 8,
        status: 'free',
      }),
    );
  });

  it('adds a table with a custom label', () => {
    store.addTable(1, 1, 'Window table');

    expect(store.floorElements().at(-1)).toEqual(
      expect.objectContaining({
        label: 'Window table',
      }),
    );
  });

  it('adds a table with a visual shape', () => {
    store.addTable(1, 1, 'Round table', 'round');

    expect(store.floorElements().at(-1)).toEqual(
      expect.objectContaining({
        type: 'table',
        label: 'Round table',
        shape: 'round',
      }),
    );
  });

  it('adds a bar layout element without creating a restaurant table', () => {
    const initialTableCount = store.restaurantTables().length;

    store.addLayoutElement('bar', 1, 1, 'Cocktail bar');
    const element = store.floorElements().at(-1);

    expect(element).toEqual(
      expect.objectContaining({
        type: 'bar',
        label: 'Cocktail bar',
      }),
    );
    expect(element).not.toHaveProperty('tableId');
    expect(store.restaurantTables().length).toBe(initialTableCount);
  });

  it('selects the table created from the first available grid space', () => {
    store.addTable(1, 1);

    expect(store.selectedTableId()).toBe('table-8');
    expect(store.errorMessage()).toBeNull();
  });

  it('creates a one-person service point when adding a stool floor element', () => {
    const initialTableCount = store.restaurantTables().length;

    store.addFloorElement({
      type: 'stool',
      label: 'Stool 9',
      x: 4,
      y: 4,
      width: 1,
      height: 1,
    });

    const element = store.floorElements().at(-1);
    const servicePoint = store.restaurantTables().find((table) => table.id === element?.tableId);

    expect(store.restaurantTables().length).toBe(initialTableCount + 1);
    expect(element).toEqual(expect.objectContaining({ type: 'stool', tableId: expect.any(String) }));
    expect(servicePoint).toEqual(expect.objectContaining({ capacity: 1, status: 'free', total: 0 }));
  });

  it('prevents adding tables with invalid dimensions', () => {
    const initialElementCount = store.floorElements().length;
    const initialTableCount = store.restaurantTables().length;

    store.addTable(0, 1);

    expect(store.floorElements().length).toBe(initialElementCount);
    expect(store.restaurantTables().length).toBe(initialTableCount);
    expect(store.errorMessage()).toBe('restaurantPos.errors.cannotPlaceElement');
  });

  it('prevents adding tables that do not fit the grid', () => {
    const initialElementCount = store.floorElements().length;
    const initialTableCount = store.restaurantTables().length;

    store.addTable(21, 1);

    expect(store.floorElements().length).toBe(initialElementCount);
    expect(store.restaurantTables().length).toBe(initialTableCount);
    expect(store.errorMessage()).toBe('restaurantPos.errors.cannotPlaceElement');
  });

  it('renames a floor element', () => {
    store.renameFloorElement('floor-element-1', 'Patio 1');

    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(
      expect.objectContaining({
        label: 'Patio 1',
      }),
    );
    expect(store.errorMessage()).toBeNull();
  });

  it('prevents renaming a floor element to an empty label', () => {
    store.renameFloorElement('floor-element-1', '   ');

    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(
      expect.objectContaining({
        label: 'M1',
      }),
    );
    expect(store.errorMessage()).toBe('restaurantPos.errors.cannotPlaceElement');
  });

  it('resizes a floor element to a valid size', () => {
    store.resizeFloorElement('floor-element-1', 3, 1);

    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(
      expect.objectContaining({
        width: 3,
        height: 1,
      }),
    );
    expect(store.errorMessage()).toBeNull();
  });

  it('prevents resizing a floor element over another element', () => {
    store.resizeFloorElement('floor-element-1', 6, 2);

    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(
      expect.objectContaining({
        width: 2,
        height: 2,
      }),
    );
    expect(store.errorMessage()).toBe('restaurantPos.errors.cannotPlaceElement');
  });

  it('deletes a table floor element and its restaurant table', () => {
    store.selectTable('table-1');
    store.deleteFloorElement('floor-element-1');

    expect(store.floorElements().some((element) => element.id === 'floor-element-1')).toBe(false);
    expect(store.restaurantTables().some((table) => table.id === 'table-1')).toBe(false);
    expect(store.ordersByTable()['table-1']).toBeUndefined();
    expect(store.selectedTableId()).toBeNull();
  });

  it('moves a floor element to a valid empty grid position', () => {
    store.moveFloorElement('floor-element-1', 3, 1);

    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(
      expect.objectContaining({
        x: 3,
        y: 1,
      }),
    );
    expect(store.errorMessage()).toBeNull();
  });

  it('prevents moving a floor element outside the grid', () => {
    store.moveFloorElement('floor-element-1', 19, 0);

    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(
      expect.objectContaining({
        x: 1,
        y: 1,
      }),
    );
    expect(store.errorMessage()).toBe('restaurantPos.errors.cannotPlaceElement');
  });

  it('prevents moving a floor element above the first row', () => {
    store.moveFloorElement('floor-element-1', 0, -1);

    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(
      expect.objectContaining({
        x: 1,
        y: 1,
      }),
    );
    expect(store.errorMessage()).toBe('restaurantPos.errors.cannotPlaceElement');
  });

  it('prevents moving a floor element over another element', () => {
    store.moveFloorElement('floor-element-1', 5, 1);

    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(
      expect.objectContaining({
        x: 1,
        y: 1,
      }),
    );
    expect(store.errorMessage()).toBe('restaurantPos.errors.cannotPlaceElement');
  });

  it('prevents removing a row when existing elements would be outside the grid', () => {
    store.addFloorElement({
      type: 'blocked',
      label: 'Last row',
      x: 19,
      y: 19,
      width: 1,
      height: 1,
    });

    store.removeRow();

    expect(store.gridRows()).toBe(20);
    expect(store.errorMessage()).toBe('restaurantPos.errors.cannotResizeGrid');
  });

  it('prevents removing a column when existing elements would be outside the grid', () => {
    store.addFloorElement({
      type: 'blocked',
      label: 'Last column',
      x: 19,
      y: 19,
      width: 1,
      height: 1,
    });

    store.removeColumn();

    expect(store.gridColumns()).toBe(20);
    expect(store.errorMessage()).toBe('restaurantPos.errors.cannotResizeGrid');
  });
});
import { provideI18nTesting } from '../../../shared/i18n/i18n-testing';
