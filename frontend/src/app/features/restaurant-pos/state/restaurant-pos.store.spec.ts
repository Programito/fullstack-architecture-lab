import { TestBed } from '@angular/core/testing';
import { RestaurantPosStore } from './restaurant-pos.store';

describe('RestaurantPosStore', () => {
  let store: RestaurantPosStore;

  beforeEach(() => {
    TestBed.resetTestingModule();
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
      {
        productId: 'product-1',
        productName: 'Craft Burger',
        quantity: 1,
        unitPrice: 12.5,
        subtotal: 12.5,
        course: 'main',
        status: 'pending',
      },
    ]);
    expect(order.total).toBe(12.5);
    expect(table?.total).toBe(12.5);
    expect(table?.status).toBe('occupied');
    expect(table?.occupiedAt).toBeTruthy();
    expect(table?.serviceStartedAt).toBeTruthy();
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
