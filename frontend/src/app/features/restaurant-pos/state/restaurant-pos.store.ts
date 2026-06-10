import { computed, Injectable, signal } from '@angular/core';
import type {
  AddFloorElementInput,
  EditableFloorElementType,
  FloorElement,
  OrderCourseGroup,
  OrderCourse,
  OrderLine,
  OrdersByTable,
  PaymentMethod,
  Product,
  PosMode,
  RestaurantTable,
  ServiceTableInfo,
  ServicePoint,
  TableOrder,
  TableStatus,
  TableShape,
} from '../models/restaurant-pos.models';
import {
  DEFAULT_GRID_COLUMNS,
  DEFAULT_GRID_ROWS,
  MOCK_FLOOR_ELEMENTS,
  MOCK_ORDERS_BY_TABLE,
  MOCK_PRODUCTS,
  MOCK_RESTAURANT_TABLES,
} from './restaurant-pos.mock-data';

const SELECT_TABLE_ERROR = 'restaurantPos.errors.selectTableFirst';
const PRODUCT_UNAVAILABLE_ERROR = 'restaurantPos.errors.productUnavailable';
const CANNOT_PLACE_ELEMENT_ERROR = 'restaurantPos.errors.cannotPlaceElement';
const CANNOT_RESIZE_GRID_ERROR = 'restaurantPos.errors.cannotResizeGrid';
const DEFAULT_ELEMENT_LABELS: Record<EditableFloorElementType, string> = {
  table: 'Table',
  bar: 'Bar',
  kitchen: 'Kitchen',
};
const COURSE_SERVICE_ORDER: OrderCourse[] = ['drinks', 'starter', 'main', 'dessert', 'other'];

@Injectable({
  providedIn: 'root',
})
export class RestaurantPosStore {
  private readonly _gridRows = signal(DEFAULT_GRID_ROWS);
  private readonly _gridColumns = signal(DEFAULT_GRID_COLUMNS);
  private readonly _floorElements = signal<FloorElement[]>(structuredClone(MOCK_FLOOR_ELEMENTS));
  private readonly _restaurantTables = signal<RestaurantTable[]>(structuredClone(MOCK_RESTAURANT_TABLES));
  private readonly _products = signal(structuredClone(MOCK_PRODUCTS));
  private readonly _ordersByTable = signal<OrdersByTable>(structuredClone(MOCK_ORDERS_BY_TABLE));
  private readonly _selectedTableId = signal<string | null>(null);
  private readonly _mode = signal<PosMode>('operation');
  private readonly _errorMessage = signal<string | null>(null);

  readonly gridRows = this._gridRows.asReadonly();
  readonly gridColumns = this._gridColumns.asReadonly();
  readonly floorElements = this._floorElements.asReadonly();
  readonly restaurantTables = this._restaurantTables.asReadonly();
  readonly products = this._products.asReadonly();
  readonly ordersByTable = this._ordersByTable.asReadonly();
  readonly selectedTableId = this._selectedTableId.asReadonly();
  readonly mode = this._mode.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly selectedTable = computed(() => {
    const selectedTableId = this._selectedTableId();
    return this._restaurantTables().find((table) => table.id === selectedTableId) ?? null;
  });
  readonly selectedOrder = computed(() => {
    const selectedTableId = this._selectedTableId();
    return selectedTableId ? (this._ordersByTable()[selectedTableId] ?? null) : null;
  });
  readonly servicePoints = computed<ServicePoint[]>(() =>
    this._floorElements()
      .filter((element) => !!element.tableId && (element.type === 'table' || element.type === 'stool'))
      .map((element) => {
        const table = this._restaurantTables().find((restaurantTable) => restaurantTable.id === element.tableId);
        return table ? { element, table } : null;
      })
      .filter((servicePoint): servicePoint is ServicePoint => servicePoint !== null),
  );
  readonly selectedServicePoint = computed(() => {
    const selectedTableId = this._selectedTableId();
    return selectedTableId ? (this.servicePoints().find((servicePoint) => servicePoint.table.id === selectedTableId) ?? null) : null;
  });
  readonly selectedServiceInfo = computed<ServiceTableInfo | null>(() => {
    const table = this.selectedTable();

    if (!table) {
      return null;
    }

    const order = this.selectedOrder() ?? this.createEmptyOrder(table.id);

    return this.createServiceTableInfo(table, order);
  });
  readonly occupiedTables = computed(() => this.servicePoints().filter((servicePoint) => this.isOccupiedServicePoint(servicePoint.table.status)).length);
  readonly activeOrders = computed(
    () => Object.values(this._ordersByTable()).filter((order) => order.lines.length > 0 && order.status !== 'paid').length,
  );
  readonly kitchenQueue = computed(
    () => Object.values(this._ordersByTable()).filter((order) => order.status === 'sent_to_kitchen').length,
  );
  readonly salesToday = computed(() => this.roundCurrency(this._restaurantTables().reduce((total, table) => total + table.total, 0)));
  readonly averageTicket = computed(() => {
    const orders = Object.values(this._ordersByTable()).filter((order) => order.total > 0);
    return orders.length === 0 ? 0 : this.roundCurrency(this.salesToday() / orders.length);
  });

  setMode(mode: PosMode): void {
    this._mode.set(mode);
  }

  selectTable(tableId: string): void {
    this._selectedTableId.set(tableId);
    this.clearError();
  }

  addProductToSelectedTable(productId: string): void {
    const tableId = this._selectedTableId();

    if (!tableId) {
      this.setError(SELECT_TABLE_ERROR);
      return;
    }

    const product = this._products().find((currentProduct) => currentProduct.id === productId);

    if (!product?.available) {
      this.setError(PRODUCT_UNAVAILABLE_ERROR);
      return;
    }

    const order = this.ensureOrder(tableId);
    const table = this.getTable(tableId);
    const now = this.nowIso();
    const nextLines = this.addProductLine(order.lines, {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: product.price,
      subtotal: product.price,
      course: this.getProductCourse(product.category),
      status: 'pending',
    });
    const total = this.calculateOrderTotal(nextLines);

    this.setOrder(tableId, {
      ...order,
      lines: nextLines,
      total,
    });
    this.updateTable(tableId, {
      status: 'occupied',
      total,
      occupiedAt: table?.occupiedAt ?? now,
      serviceStartedAt: table?.serviceStartedAt ?? now,
      cleaningStartedAt: undefined,
    });
    this.clearError();
  }

  increaseSelectedOrderLine(productId: string): void {
    this.addProductToSelectedTable(productId);
  }

  decreaseSelectedOrderLine(productId: string): void {
    const tableId = this._selectedTableId();

    if (!tableId) {
      this.setError(SELECT_TABLE_ERROR);
      return;
    }

    const order = this.ensureOrder(tableId);
    const existingLine = order.lines.find((line) => line.productId === productId);

    if (!existingLine) {
      return;
    }

    const nextLines =
      existingLine.quantity <= 1
        ? order.lines.filter((line) => line.productId !== productId)
        : order.lines.map((line) =>
            line.productId === productId
              ? {
                  ...line,
                  quantity: line.quantity - 1,
                  subtotal: this.roundCurrency((line.quantity - 1) * line.unitPrice),
                }
              : line,
          );
    const total = this.calculateOrderTotal(nextLines);

    this.setOrder(tableId, {
      ...order,
      lines: nextLines,
      total,
    });
    this.updateTable(tableId, { total });
    this.clearError();
  }

  occupySelectedTable(): void {
    const tableId = this._selectedTableId();

    if (!tableId) {
      this.setError(SELECT_TABLE_ERROR);
      return;
    }

    const table = this.getTable(tableId);
    const now = this.nowIso();

    this.updateTable(tableId, {
      status: 'occupied',
      occupiedAt: table?.occupiedAt ?? now,
      serviceStartedAt: table?.serviceStartedAt ?? now,
      cleaningStartedAt: undefined,
    });
    this.clearError();
  }

  sendSelectedOrderToKitchen(): void {
    this.updateSelectedOrderStatus('sent_to_kitchen', 'waiting_kitchen', true);
  }

  markSelectedOrderAsServed(): void {
    this.updateSelectedOrderStatus('served', 'served');
  }

  chargeSelectedTable(): void {
    this.updateSelectedOrderStatus('paid', 'paid');
  }

  markSelectedPaymentPending(): void {
    this.updateSelectedOrderStatus('payment_pending', 'payment_pending');
  }

  freeSelectedTable(): void {
    const tableId = this._selectedTableId();

    if (!tableId) {
      this.setError(SELECT_TABLE_ERROR);
      return;
    }

    this.setOrder(tableId, {
      tableId,
      lines: [],
      total: 0,
      status: 'open',
      paymentMethod: 'pending',
    });
    this.updateTable(tableId, {
      status: 'free',
      total: 0,
      occupiedAt: undefined,
      serviceStartedAt: undefined,
      cleaningStartedAt: undefined,
    });
    this.clearError();
  }

  markSelectedTableForCleaning(): void {
    const tableId = this._selectedTableId();

    if (!tableId) {
      this.setError(SELECT_TABLE_ERROR);
      return;
    }

    this.updateTable(tableId, {
      status: 'cleaning',
      cleaningStartedAt: this.nowIso(),
    });
    this.clearError();
  }

  setSelectedPaymentMethod(paymentMethod: PaymentMethod): void {
    const tableId = this._selectedTableId();

    if (!tableId) {
      this.setError(SELECT_TABLE_ERROR);
      return;
    }

    const order = this.ensureOrder(tableId);

    this.setOrder(tableId, {
      ...order,
      paymentMethod,
    });
    this.clearError();
  }

  addRow(): void {
    this._gridRows.update((rows) => rows + 1);
    this.clearError();
  }

  addColumn(): void {
    this._gridColumns.update((columns) => columns + 1);
    this.clearError();
  }

  setGridSize(rows: number, columns: number): void {
    if (rows < 1 || columns < 1 || this.hasElementsOutsideBounds(rows, columns)) {
      this.setError(CANNOT_RESIZE_GRID_ERROR);
      return;
    }

    this._gridRows.set(rows);
    this._gridColumns.set(columns);
    this.clearError();
  }

  removeRow(): void {
    const nextRows = this._gridRows() - 1;

    if (nextRows < 1 || this.hasElementsOutsideBounds(nextRows, this._gridColumns())) {
      this.setError(CANNOT_RESIZE_GRID_ERROR);
      return;
    }

    this._gridRows.set(nextRows);
    this.clearError();
  }

  removeColumn(): void {
    const nextColumns = this._gridColumns() - 1;

    if (nextColumns < 1 || this.hasElementsOutsideBounds(this._gridRows(), nextColumns)) {
      this.setError(CANNOT_RESIZE_GRID_ERROR);
      return;
    }

    this._gridColumns.set(nextColumns);
    this.clearError();
  }

  addTable(width: number, height: number, label?: string, shape?: TableShape): void {
    this.addLayoutElement('table', width, height, label, shape);
  }

  addLayoutElement(type: EditableFloorElementType, width: number, height: number, label?: string, shape?: TableShape): void {
    const placement = this.findAvailablePlacement(width, height);

    if (!placement) {
      this.setError(CANNOT_PLACE_ELEMENT_ERROR);
      return;
    }

    const tableNumber = type === 'table' ? this.getNextTableNumber() : null;
    const tableId = tableNumber ? `table-${tableNumber}` : undefined;
    const fallbackLabel = tableNumber ? `M${tableNumber}` : DEFAULT_ELEMENT_LABELS[type];

    this.addFloorElement({
      type,
      label: this.normalizeLabel(label) || fallbackLabel,
      x: placement.x,
      y: placement.y,
      width,
      height,
      ...(type === 'table' && shape ? { shape } : {}),
      ...(tableId ? { tableId } : {}),
    });

    if (tableId) {
      this._selectedTableId.set(tableId);
    }
  }

  addFloorElement(input: AddFloorElementInput): void {
    if (!this.canPlaceElement(input)) {
      this.setError(CANNOT_PLACE_ELEMENT_ERROR);
      return;
    }

    const elementId = this.createFloorElementId();
    const tableId = input.type === 'table' || input.type === 'stool' ? (input.tableId ?? this.createTableId()) : input.tableId;
    const element: FloorElement = {
      ...input,
      id: elementId,
      ...(tableId ? { tableId } : {}),
    };

    this._floorElements.update((elements) => [...elements, element]);

    if ((input.type === 'table' || input.type === 'stool') && tableId && !this.getTable(tableId)) {
      this.createRestaurantTable(tableId, input.type === 'stool' ? 1 : 4);
    }

    this.clearError();
  }

  deleteFloorElement(elementId: string): void {
    const element = this._floorElements().find((currentElement) => currentElement.id === elementId);

    this._floorElements.update((elements) => elements.filter((currentElement) => currentElement.id !== elementId));

    if (element?.tableId) {
      const tableId = element.tableId;

      this._restaurantTables.update((tables) => tables.filter((table) => table.id !== tableId));
      this._ordersByTable.update(({ [tableId]: _removedOrder, ...orders }) => orders);

      if (this._selectedTableId() === tableId) {
        this._selectedTableId.set(null);
      }
    }

    this.clearError();
  }

  renameFloorElement(elementId: string, label: string): void {
    const normalizedLabel = this.normalizeLabel(label);

    if (!normalizedLabel) {
      this.setError(CANNOT_PLACE_ELEMENT_ERROR);
      return;
    }

    this._floorElements.update((elements) =>
      elements.map((element) => (element.id === elementId ? { ...element, label: normalizedLabel } : element)),
    );
    this.clearError();
  }

  resizeFloorElement(elementId: string, width: number, height: number): void {
    const element = this._floorElements().find((currentElement) => currentElement.id === elementId);

    if (!element) {
      this.setError(CANNOT_PLACE_ELEMENT_ERROR);
      return;
    }

    const nextElement = {
      ...element,
      width,
      height,
    };

    if (!this.canPlaceElement(nextElement, elementId)) {
      this.setError(CANNOT_PLACE_ELEMENT_ERROR);
      return;
    }

    this._floorElements.update((elements) =>
      elements.map((currentElement) => (currentElement.id === elementId ? nextElement : currentElement)),
    );
    this.clearError();
  }

  updateFloorElementDetails(elementId: string, patch: Pick<FloorElement, 'label' | 'type' | 'width' | 'height'> & { shape?: TableShape }): void {
    const element = this._floorElements().find((currentElement) => currentElement.id === elementId);

    if (!element) {
      this.setError(CANNOT_PLACE_ELEMENT_ERROR);
      return;
    }

    const normalizedLabel = this.normalizeLabel(patch.label);

    if (!normalizedLabel) {
      this.setError(CANNOT_PLACE_ELEMENT_ERROR);
      return;
    }

    const nextElement: FloorElement = {
      ...element,
      ...patch,
      label: normalizedLabel,
      ...(patch.type === 'table' && patch.shape ? { shape: patch.shape } : { shape: undefined }),
    };

    if (!this.canPlaceElement(nextElement, elementId)) {
      this.setError(CANNOT_PLACE_ELEMENT_ERROR);
      return;
    }

    this._floorElements.update((elements) =>
      elements.map((currentElement) => (currentElement.id === elementId ? nextElement : currentElement)),
    );
    this.clearError();
  }

  updateTableCapacityForElement(elementId: string, capacity: number): void {
    const element = this._floorElements().find((currentElement) => currentElement.id === elementId);

    if (!element?.tableId || capacity < 1) {
      return;
    }

    this._restaurantTables.update((tables) =>
      tables.map((table) => (table.id === element.tableId ? { ...table, capacity: Math.floor(capacity) } : table)),
    );
  }

  moveFloorElement(elementId: string, x: number, y: number): void {
    const element = this._floorElements().find((currentElement) => currentElement.id === elementId);

    if (!element) {
      this.setError(CANNOT_PLACE_ELEMENT_ERROR);
      return;
    }

    const nextElement = {
      ...element,
      x,
      y,
    };

    if (!this.canPlaceElement(nextElement, elementId)) {
      this.setError(CANNOT_PLACE_ELEMENT_ERROR);
      return;
    }

    this._floorElements.update((elements) =>
      elements.map((currentElement) => (currentElement.id === elementId ? nextElement : currentElement)),
    );
    this.clearError();
  }

  canPlaceElement(input: AddFloorElementInput, ignoredElementId?: string): boolean {
    if (input.x < 0 || input.y < 0 || input.width < 1 || input.height < 1) {
      return false;
    }

    if (input.x + input.width > this._gridColumns() || input.y + input.height > this._gridRows()) {
      return false;
    }

    return !this._floorElements().some((element) => element.id !== ignoredElementId && this.overlaps(element, input));
  }

  private updateSelectedOrderStatus(
    orderStatus: TableOrder['status'],
    tableStatus: TableStatus,
    requireLines = false,
  ): void {
    const tableId = this._selectedTableId();

    if (!tableId) {
      this.setError(SELECT_TABLE_ERROR);
      return;
    }

    const order = this.ensureOrder(tableId);

    if (requireLines && order.lines.length === 0) {
      this.setError(SELECT_TABLE_ERROR);
      return;
    }

    this.setOrder(tableId, {
      ...order,
      status: orderStatus,
      lines: this.updateLinesForStatus(order.lines, orderStatus),
    });
    this.updateTable(tableId, {
      status: tableStatus,
      ...(tableStatus === 'payment_pending' ? {} : { cleaningStartedAt: undefined }),
    });
    this.clearError();
  }

  private createServiceTableInfo(table: RestaurantTable, order: TableOrder): ServiceTableInfo {
    const pendingKitchenCount = this.getPendingKitchenCount(order.lines);
    const canSendToKitchen = pendingKitchenCount > 0;
    const canMarkServed = order.lines.some((line) => line.status !== 'served');
    const canCharge = order.total > 0 && table.status !== 'paid' && table.status !== 'cleaning';
    const canMarkCleaning = table.status === 'occupied' || table.status === 'served' || table.status === 'payment_pending' || table.status === 'paid';
    const canFreeTable = table.status === 'paid' || table.status === 'cleaning';

    return {
      table,
      order,
      courseGroups: this.groupOrderCourses(order.lines),
      pendingKitchenCount,
      servicePhase: this.getServicePhase(order.lines),
      nextAction: this.getNextServiceAction({ canSendToKitchen, canMarkServed, canCharge, canMarkCleaning, canFreeTable, pendingKitchenCount }),
      canSendToKitchen,
      canMarkServed,
      canCharge,
      canMarkCleaning,
      canFreeTable,
    };
  }

  private groupOrderCourses(lines: OrderLine[]): OrderCourseGroup[] {
    return COURSE_SERVICE_ORDER.map((course) => {
      const courseLines = lines.filter((line) => line.course === course);

      return {
        course,
        lines: courseLines,
        quantity: courseLines.reduce((sum, line) => sum + line.quantity, 0),
        total: this.roundCurrency(courseLines.reduce((sum, line) => sum + line.subtotal, 0)),
      };
    }).filter((group) => group.lines.length > 0);
  }

  private getPendingKitchenCount(lines: OrderLine[]): number {
    return lines.filter((line) => line.status === 'pending').reduce((sum, line) => sum + line.quantity, 0);
  }

  private getServicePhase(lines: OrderLine[]): ServiceTableInfo['servicePhase'] {
    if (lines.length === 0) {
      return { course: null, status: 'no_order' };
    }

    const pendingLine = COURSE_SERVICE_ORDER.map((course) => lines.find((line) => line.course === course && line.status !== 'served')).find(Boolean);

    if (pendingLine) {
      return { course: pendingLine.course, status: 'pending' };
    }

    return { course: null, status: 'ready_to_charge' };
  }

  private getNextServiceAction(input: {
    canSendToKitchen: boolean;
    canMarkServed: boolean;
    canCharge: boolean;
    canMarkCleaning: boolean;
    canFreeTable: boolean;
    pendingKitchenCount: number;
  }): ServiceTableInfo['nextAction'] {
    if (input.canSendToKitchen && input.pendingKitchenCount > 0) {
      return { type: 'send_kitchen', count: input.pendingKitchenCount };
    }

    if (input.canMarkServed) {
      return { type: 'mark_served', count: 0 };
    }

    if (input.canCharge) {
      return { type: 'charge', count: 0 };
    }

    if (input.canMarkCleaning) {
      return { type: 'cleaning', count: 0 };
    }

    if (input.canFreeTable) {
      return { type: 'free_table', count: 0 };
    }

    return { type: 'none', count: 0 };
  }

  private updateLinesForStatus(lines: OrderLine[], orderStatus: TableOrder['status']): OrderLine[] {
    if (orderStatus === 'sent_to_kitchen') {
      const now = this.nowIso();

      return lines.map((line) =>
        line.status === 'pending'
          ? {
              ...line,
              status: 'sent_to_kitchen',
              sentToKitchenAt: now,
            }
          : line,
      );
    }

    if (orderStatus === 'served') {
      const now = this.nowIso();

      return lines.map((line) => ({
        ...line,
        status: 'served',
        sentToKitchenAt: line.sentToKitchenAt ?? now,
        servedAt: line.servedAt ?? now,
      }));
    }

    return lines;
  }

  private addProductLine(lines: OrderLine[], nextLine: OrderLine): OrderLine[] {
    const existingLine = lines.find((line) => line.productId === nextLine.productId);

    if (!existingLine) {
      return [...lines, nextLine];
    }

    return lines.map((line) =>
      line.productId === nextLine.productId
        ? {
            ...line,
            quantity: line.quantity + 1,
            subtotal: this.roundCurrency((line.quantity + 1) * line.unitPrice),
            status: line.status === 'served' ? 'pending' : line.status,
            servedAt: line.status === 'served' ? undefined : line.servedAt,
          }
        : line,
    );
  }

  private calculateOrderTotal(lines: OrderLine[]): number {
    return this.roundCurrency(lines.reduce((total, line) => total + line.subtotal, 0));
  }

  private setOrder(tableId: string, order: TableOrder): void {
    this._ordersByTable.update((ordersByTable) => ({
      ...ordersByTable,
      [tableId]: order,
    }));
  }

  private ensureOrder(tableId: string): TableOrder {
    return this._ordersByTable()[tableId] ?? this.createEmptyOrder(tableId);
  }

  private createEmptyOrder(tableId: string): TableOrder {
    return {
      tableId,
      lines: [],
      total: 0,
      status: 'open',
      paymentMethod: 'pending',
    };
  }

  private updateTable(tableId: string, patch: Partial<RestaurantTable>): void {
    this._restaurantTables.update((tables) =>
      tables.map((table) =>
        table.id === tableId
          ? {
              ...table,
              ...patch,
            }
          : table,
      ),
    );
  }

  private createRestaurantTable(tableId: string, capacity = 4): void {
    const nextNumber = this.getNextTableNumber();
    const table: RestaurantTable = {
      id: tableId,
      number: nextNumber,
      capacity,
      status: 'free',
      total: 0,
      openDuration: '12m',
    };

    this._restaurantTables.update((tables) => [...tables, table]);
    this.setOrder(tableId, {
      tableId,
      lines: [],
      total: 0,
      status: 'open',
      paymentMethod: 'pending',
    });
  }

  private getTable(tableId: string): RestaurantTable | undefined {
    return this._restaurantTables().find((table) => table.id === tableId);
  }

  private createFloorElementId(): string {
    return `floor-element-${this._floorElements().length + 1}`;
  }

  private createTableId(): string {
    return `table-${this.getNextTableNumber()}`;
  }

  private getNextTableNumber(): number {
    return Math.max(0, ...this._restaurantTables().map((table) => table.number)) + 1;
  }

  private hasElementsOutsideBounds(rows: number, columns: number): boolean {
    return this._floorElements().some((element) => element.x + element.width > columns || element.y + element.height > rows);
  }

  private findAvailablePlacement(width: number, height: number): Pick<FloorElement, 'x' | 'y'> | null {
    if (width < 1 || height < 1 || width > this._gridColumns() || height > this._gridRows()) {
      return null;
    }

    for (let y = 0; y <= this._gridRows() - height; y += 1) {
      for (let x = 0; x <= this._gridColumns() - width; x += 1) {
        const candidate: AddFloorElementInput = {
          type: 'table',
          label: 'Table',
          x,
          y,
          width,
          height,
        };

        if (this.canPlaceElement(candidate)) {
          return { x, y };
        }
      }
    }

    return null;
  }

  private overlaps(first: Pick<FloorElement, 'x' | 'y' | 'width' | 'height'>, second: AddFloorElementInput): boolean {
    return (
      first.x < second.x + second.width &&
      first.x + first.width > second.x &&
      first.y < second.y + second.height &&
      first.y + first.height > second.y
    );
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private getProductCourse(category: Product['category']): OrderCourse {
    switch (category.toLowerCase()) {
      case 'drinks':
      case 'coffee':
        return 'drinks';
      case 'tapas':
      case 'salads':
        return 'starter';
      case 'burgers':
        return 'main';
      case 'desserts':
        return 'dessert';
      default:
        return 'other';
    }
  }

  private nowIso(): string {
    return new Date().toISOString();
  }

  private normalizeLabel(label: string | undefined): string {
    return label?.trim() ?? '';
  }

  private isOccupiedServicePoint(status: TableStatus): boolean {
    return status !== 'free' && status !== 'reserved';
  }

  private setError(message: string): void {
    this._errorMessage.set(message);
  }

  private clearError(): void {
    this._errorMessage.set(null);
  }
}
