import { computed, inject, Injectable, signal, untracked } from '@angular/core';

import type {
  AddFloorElementInput,
  EditableFloorElementType,
  FloorElement,
  OrdersByTable,
  PaymentMethod,
  PosMode,
  PreparationBoardColumnId,
  PreparationMoveResult,
  Product,
  RestaurantTable,
  ServiceTableInfo,
  TableOrder,
  TableShape,
} from '../models/restaurant-pos.models';
import type { ComboSlotSelection } from '../../menu/models/menu.models';
import { RestaurantFloorStore } from './restaurant-floor.store';
import { RestaurantOrderStore } from './restaurant-order.store';

const SELECT_TABLE_ERROR = 'restaurantPos.errors.selectTableFirst';
const PRODUCT_UNAVAILABLE_ERROR = 'restaurantPos.errors.productUnavailable';
const CANNOT_PLACE_ELEMENT_ERROR = 'restaurantPos.errors.cannotPlaceElement';
const CANNOT_RESIZE_GRID_ERROR = 'restaurantPos.errors.cannotResizeGrid';

const DEFAULT_ELEMENT_LABELS: Record<EditableFloorElementType, string> = {
  table: 'Table',
  bar: 'Bar',
  kitchen: 'Kitchen',
};

const COURSE_SERVICE_ORDER = ['drinks', 'starter', 'main', 'dessert', 'other'] as const;

@Injectable({ providedIn: 'root' })
export class RestaurantPosStore {
  private readonly floor = inject(RestaurantFloorStore);
  private readonly order = inject(RestaurantOrderStore);

  private readonly _selectedTableId = signal<string | null>(null);
  private readonly _mode = signal<PosMode>('operation');
  private readonly _errorMessage = signal<string | null>(null);

  // --- floor delegates ---
  readonly gridRows = this.floor.gridRows;
  readonly gridColumns = this.floor.gridColumns;
  readonly activeFloorId = this.floor.activeFloorId;
  readonly activeFloorName = this.floor.activeFloorName;
  readonly floorElements = this.floor.floorElements;
  readonly restaurantTables = this.floor.restaurantTables;
  readonly servicePoints = this.floor.servicePoints;

  // --- order delegates ---
  readonly products = this.order.products;
  readonly ordersByTable = this.order.ordersByTable;
  readonly paidOrdersByTable = this.order.paidOrdersByTable;
  readonly occupiedTables = this.order.occupiedTables;
  readonly activeOrders = this.order.activeOrders;
  readonly kitchenQueue = this.order.kitchenQueue;
  readonly kitchenTickets = this.order.kitchenTickets;
  readonly kitchenBoardColumns = this.order.kitchenBoardColumns;
  readonly preparationBoardColumns = this.order.preparationBoardColumns;
  readonly servedPreparationCards = this.order.servedPreparationCards;
  readonly salesToday = this.order.salesToday;
  readonly averageTicket = this.order.averageTicket;

  // --- own state ---
  readonly selectedTableId = this._selectedTableId.asReadonly();
  readonly mode = this._mode.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();

  // --- combined computeds ---
  readonly selectedTable = computed(() => {
    const id = this._selectedTableId();
    return id ? (this.floor.restaurantTables().find((t) => t.id === id) ?? null) : null;
  });
  readonly selectedOrder = computed(() => {
    const id = this._selectedTableId();
    return id ? (this.order.ordersByTable()[id] ?? null) : null;
  });
  readonly selectedServicePoint = computed(() => {
    const id = this._selectedTableId();
    return id ? (this.floor.servicePoints().find((sp) => sp.table.id === id) ?? null) : null;
  });
  readonly selectedServiceInfo = computed<ServiceTableInfo | null>(() => {
    const table = this.selectedTable();
    if (!table) return null;
    const orderVal = this.selectedOrder() ?? this.order.createEmptyOrder(table.id);
    return this.buildServiceTableInfo(table, orderVal);
  });

  // === mode & selection ===
  setMode(mode: PosMode): void {
    this._mode.set(mode);
  }

  selectTable(tableId: string): void {
    this._selectedTableId.set(tableId);
    this.clearError();
  }

  // === products ===
  hydrateProducts(products: Product[]): void {
    this.order.hydrateProducts(products);
  }

  // === order mutations (selection-aware wrappers) ===
  addProductToSelectedTable(productId: string): void {
    const tableId = this._selectedTableId();
    if (!tableId) { this.setError(SELECT_TABLE_ERROR); return; }
    const err = this.order.addProductToTable(tableId, productId);
    if (err) this.setError(err); else this.clearError();
  }

  addCustomizedProductToSelectedTable(productId: string, selectedModifierOptionIds: string[] = [], kitchenNote = ''): void {
    const tableId = this._selectedTableId();
    if (!tableId) { this.setError(SELECT_TABLE_ERROR); return; }
    const err = this.order.addCustomizedProductToTable(tableId, productId, selectedModifierOptionIds, kitchenNote);
    if (err) this.setError(err); else this.clearError();
  }

  addConfiguredComboToSelectedTable(comboProductId: string, slotSelections: ComboSlotSelection[]): void {
    const tableId = this._selectedTableId();
    if (!tableId) { this.setError(SELECT_TABLE_ERROR); return; }
    const err = this.order.addConfiguredComboToTable(tableId, comboProductId, slotSelections);
    if (err) this.setError(err); else this.clearError();
  }

  increaseSelectedOrderLine(lineIdOrProductId: string): void {
    const tableId = this._selectedTableId();
    if (!tableId) { this.setError(SELECT_TABLE_ERROR); return; }
    const err = this.order.increaseOrderLine(tableId, lineIdOrProductId);
    if (err) this.setError(err); else this.clearError();
  }

  decreaseSelectedOrderLine(lineIdOrProductId: string): void {
    const tableId = this._selectedTableId();
    if (!tableId) { this.setError(SELECT_TABLE_ERROR); return; }
    this.order.decreaseOrderLine(tableId, lineIdOrProductId);
    this.clearError();
  }

  removeSelectedOrderLine(lineIdOrProductId: string): void {
    const tableId = this._selectedTableId();
    if (!tableId) { this.setError(SELECT_TABLE_ERROR); return; }
    this.order.removeOrderLine(tableId, lineIdOrProductId);
    this.clearError();
  }

  updateSelectedOrderLineNote(lineIdOrProductId: string, note: string): void {
    const tableId = this._selectedTableId();
    if (!tableId) return;
    this.order.updateOrderLineNote(tableId, lineIdOrProductId, note);
  }

  occupySelectedTable(): void {
    const tableId = this._selectedTableId();
    if (!tableId) { this.setError(SELECT_TABLE_ERROR); return; }
    this.order.occupyTable(tableId);
    this.clearError();
  }

  sendSelectedOrderToKitchen(): void {
    const tableId = this._selectedTableId();
    if (!tableId) { this.setError(SELECT_TABLE_ERROR); return; }
    const err = this.order.sendOrderToKitchen(tableId);
    if (err) this.setError(err); else this.clearError();
  }

  markSelectedOrderAsServed(): void {
    const tableId = this._selectedTableId();
    if (!tableId) { this.setError(SELECT_TABLE_ERROR); return; }
    this.order.markOrderServed(tableId);
    this.clearError();
  }

  chargeSelectedTable(): void {
    const tableId = this._selectedTableId();
    if (!tableId) { this.setError(SELECT_TABLE_ERROR); return; }
    this.order.chargeTable(tableId);
    this.clearError();
  }

  markSelectedPaymentPending(): void {
    const tableId = this._selectedTableId();
    if (!tableId) { this.setError(SELECT_TABLE_ERROR); return; }
    this.order.markPaymentPending(tableId);
    this.clearError();
  }

  freeSelectedTable(): void {
    const tableId = this._selectedTableId();
    if (!tableId) { this.setError(SELECT_TABLE_ERROR); return; }
    this.order.freeTable(tableId);
    this.clearError();
  }

  markSelectedTableForCleaning(): void {
    const tableId = this._selectedTableId();
    if (!tableId) { this.setError(SELECT_TABLE_ERROR); return; }
    this.order.markTableForCleaning(tableId);
    this.clearError();
  }

  setSelectedPaymentMethod(paymentMethod: PaymentMethod): void {
    const tableId = this._selectedTableId();
    if (!tableId) { this.setError(SELECT_TABLE_ERROR); return; }
    this.order.setPaymentMethod(tableId, paymentMethod);
    this.clearError();
  }

  markSelectedOrderLineReady(lineIdOrProductId: string): void {
    const tableId = this._selectedTableId();
    if (!tableId) return;
    this.order.markOrderLineReadyForTable(tableId, lineIdOrProductId);
  }

  markSelectedOrderLineServed(lineIdOrProductId: string): void {
    const tableId = this._selectedTableId();
    if (!tableId) return;
    this.order.markOrderLineServed(tableId, lineIdOrProductId);
  }

  // === kitchen/prep (explicit tableId, pass-through) ===
  markOrderLinePreparing(tableId: string, lineIdOrProductId: string): void {
    this.order.markOrderLinePreparing(tableId, lineIdOrProductId);
  }

  markOrderLineServed(tableId: string, lineIdOrProductId: string): void {
    this.order.markOrderLineServed(tableId, lineIdOrProductId);
  }

  markOrderLineReady(tableId: string, lineIdOrProductId: string): void {
    this.order.markOrderLineReady(tableId, lineIdOrProductId);
  }

  moveOrderLineBackInKitchen(tableId: string, lineIdOrProductId: string): void {
    this.order.moveOrderLineBackInKitchen(tableId, lineIdOrProductId);
  }

  archiveOrderLineFromKitchen(tableId: string, lineIdOrProductId: string): void {
    this.order.archiveOrderLineFromKitchen(tableId, lineIdOrProductId);
  }

  movePreparationLine(tableId: string, lineIdOrProductId: string, targetColumn: PreparationBoardColumnId): PreparationMoveResult {
    return this.order.movePreparationLine(tableId, lineIdOrProductId, targetColumn);
  }

  cancelPreparationLine(tableId: string, lineIdOrProductId: string): void {
    this.order.cancelPreparationLine(tableId, lineIdOrProductId);
  }

  // === hydration ===
  hydrateLayout(input: {
    floorId?: string | null;
    floorName?: string;
    rows: number;
    columns: number;
    floorElements: FloorElement[];
    restaurantTables: RestaurantTable[];
  }): void {
    this.floor.hydrateLayout(input);
    this.clearError();
  }

  hydrateServiceFloor(input: {
    floorId?: string | null;
    floorName?: string;
    rows: number;
    columns: number;
    floorElements: FloorElement[];
    restaurantTables: RestaurantTable[];
  }): void {
    this.floor.hydrateLayout(input);
    this.order.initializeOrdersForTables(input.restaurantTables, untracked(() => this.order.ordersByTable()));
    const selected = this._selectedTableId();
    if (selected && !input.restaurantTables.some((t) => t.id === selected)) {
      this._selectedTableId.set(null);
    }
  }

  hydrateServicePoint(input: { table: RestaurantTable; floorElement?: FloorElement | null }): void {
    this.floor.hydrateServicePoint(input);
    this.clearError();
  }

  hydrateServicePointOrder(tableId: string, orderData: TableOrder | null): void {
    this.order.hydrateServicePointOrder(tableId, orderData);
    this.clearError();
  }

  getOrder(tableId: string): TableOrder | null {
    return this.order.getOrder(tableId) ?? null;
  }

  // === floor mutations (with error handling) ===
  addRow(): void { this.floor.addRow(); this.clearError(); }

  addColumn(): void { this.floor.addColumn(); this.clearError(); }

  removeRow(): void {
    if (!this.floor.removeRow()) this.setError(CANNOT_RESIZE_GRID_ERROR);
    else this.clearError();
  }

  removeColumn(): void {
    if (!this.floor.removeColumn()) this.setError(CANNOT_RESIZE_GRID_ERROR);
    else this.clearError();
  }

  setGridSize(rows: number, columns: number): void {
    if (!this.floor.setGridSize(rows, columns)) this.setError(CANNOT_RESIZE_GRID_ERROR);
    else this.clearError();
  }

  addTable(width: number, height: number, label?: string, shape?: TableShape): void {
    this.addLayoutElement('table', width, height, label, shape);
  }

  addLayoutElement(type: EditableFloorElementType, width: number, height: number, label?: string, shape?: TableShape): void {
    const placement = this.floor.findAvailablePlacement(width, height);
    if (!placement) { this.setError(CANNOT_PLACE_ELEMENT_ERROR); return; }
    const tableNumber = type === 'table' ? this.floor.getNextTableNumber() : null;
    const tableId = tableNumber ? `table-${tableNumber}` : undefined;
    const fallbackLabel = tableNumber ? `M${tableNumber}` : DEFAULT_ELEMENT_LABELS[type];
    this.floor.addFloorElement({
      type,
      label: (label?.trim() ?? '') || fallbackLabel,
      x: placement.x,
      y: placement.y,
      width,
      height,
      ...(type === 'table' && shape ? { shape } : {}),
      ...(tableId ? { tableId } : {}),
    });
    if (tableId) this._selectedTableId.set(tableId);
    this.clearError();
  }

  addFloorElement(input: AddFloorElementInput): void {
    if (!this.floor.addFloorElement(input)) this.setError(CANNOT_PLACE_ELEMENT_ERROR);
    else this.clearError();
  }

  deleteFloorElement(elementId: string): void {
    const tableId = this.floor.deleteFloorElement(elementId);
    if (tableId) {
      this.order.removeTableOrder(tableId);
      if (this._selectedTableId() === tableId) this._selectedTableId.set(null);
    }
    this.clearError();
  }

  renameFloorElement(elementId: string, label: string): void {
    if (!this.floor.renameFloorElement(elementId, label)) this.setError(CANNOT_PLACE_ELEMENT_ERROR);
    else this.clearError();
  }

  resizeFloorElement(elementId: string, width: number, height: number): void {
    if (!this.floor.resizeFloorElement(elementId, width, height)) this.setError(CANNOT_PLACE_ELEMENT_ERROR);
    else this.clearError();
  }

  updateFloorElementDetails(
    elementId: string,
    patch: Pick<FloorElement, 'label' | 'type' | 'width' | 'height'> & { shape?: TableShape },
  ): void {
    if (!this.floor.updateFloorElementDetails(elementId, patch)) this.setError(CANNOT_PLACE_ELEMENT_ERROR);
    else this.clearError();
  }

  moveFloorElement(elementId: string, x: number, y: number): void {
    if (!this.floor.moveFloorElement(elementId, x, y)) this.setError(CANNOT_PLACE_ELEMENT_ERROR);
    else this.clearError();
  }

  updateTableCapacityForElement(elementId: string, capacity: number): void {
    this.floor.updateTableCapacityForElement(elementId, capacity);
  }

  canPlaceElement(input: AddFloorElementInput, ignoredElementId?: string): boolean {
    return this.floor.canPlaceElement(input, ignoredElementId);
  }

  nextFloorElementSortOrder(): number {
    return this.floor.nextFloorElementSortOrder();
  }

  reportApiError(message: string): void {
    this.setError(message);
  }

  // === private helpers ===
  private buildServiceTableInfo(table: RestaurantTable, orderVal: TableOrder): ServiceTableInfo {
    // Las líneas canceladas se conservan en el backend para auditoría (nunca se
    // borran de verdad), pero para el pedido activo son peso muerto: no deben
    // mostrarse, contarse, ni bloquear "todo servido"/"listo para cobrar" —
    // si no, el panel sigue ofreciendo un botón Eliminar que el backend
    // rechaza para siempre (el DELETE solo admite líneas en estado
    // 'pending', y una línea cancelada ya no lo está).
    const paidOrders = this.order.paidOrdersByTable()[table.id] ?? [];
    const latestPaidOrder = paidOrders.at(-1) ?? null;
    const activeLines = orderVal.lines.filter((l) => l.status !== 'cancelled');
    const pendingKitchenCount = activeLines
      .filter((l) => l.status === 'pending')
      .reduce((sum, l) => sum + l.quantity, 0);
    const canSendToKitchen = pendingKitchenCount > 0;
    const canMarkServed = activeLines.some((l) => l.status !== 'served');
    const canCharge = orderVal.total > 0 && table.status !== 'paid' && table.status !== 'cleaning';
    const canMarkCleaning =
      table.status === 'occupied' || table.status === 'served' || table.status === 'payment_pending' || table.status === 'paid';
    const canFreeTable = table.status === 'paid' || table.status === 'cleaning';

    const courseGroups = COURSE_SERVICE_ORDER.map((course) => {
      const lines = activeLines.filter((l) => l.course === course);
      return {
        course,
        lines,
        quantity: lines.reduce((sum, l) => sum + l.quantity, 0),
        total: Math.round(lines.reduce((sum, l) => sum + l.subtotal, 0) * 100) / 100,
      };
    }).filter((g) => g.lines.length > 0);

    const pendingLine = COURSE_SERVICE_ORDER.map((course) =>
      activeLines.find((l) => l.course === course && l.status !== 'served'),
    ).find(Boolean);
    const servicePhase: ServiceTableInfo['servicePhase'] =
      activeLines.length === 0
        ? { course: null, status: 'no_order' }
        : pendingLine
          ? { course: pendingLine.course, status: 'pending' }
          : { course: null, status: 'ready_to_charge' };

    const nextAction: ServiceTableInfo['nextAction'] =
      canSendToKitchen && pendingKitchenCount > 0
        ? { type: 'send_kitchen', count: pendingKitchenCount }
        : canMarkServed
          ? { type: 'mark_served', count: 0 }
          : canCharge
            ? { type: 'charge', count: 0 }
            : canMarkCleaning
              ? { type: 'cleaning', count: 0 }
              : canFreeTable
                ? { type: 'free_table', count: 0 }
                : { type: 'none', count: 0 };

    return {
      table,
      order: orderVal,
      paidOrders,
      ...(latestPaidOrder
        ? {
            paidSummary: {
              isPaid: true,
              lastPayment: latestPaidOrder.lastCompletedPayment ?? null,
              lastOrderTotal: latestPaidOrder.total,
            },
          }
        : {}),
      courseGroups,
      pendingKitchenCount,
      servicePhase,
      nextAction,
      canSendToKitchen,
      canMarkServed,
      canCharge,
      canMarkCleaning,
      canFreeTable,
    };
  }

  private setError(message: string): void {
    this._errorMessage.set(message);
  }

  private clearError(): void {
    this._errorMessage.set(null);
  }
}
