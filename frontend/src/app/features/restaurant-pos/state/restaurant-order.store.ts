import { computed, inject, Injectable, signal, untracked } from '@angular/core';

import type { ComboProductDefinition, ComboSlotSelection } from '../../menu/models/menu.models';
import { MenuMockService } from '../../menu/services/menu-mock.service';
import { MenuPricingService } from '../../menu/services/menu-pricing.service';
import { MenuValidationService } from '../../menu/services/menu-validation.service';
import type {
  KitchenBoardColumn,
  KitchenBoardStatus,
  KitchenOrderTicket,
  OrderCourse,
  OrderCourseGroup,
  OrderLine,
  OrderLineProductSnapshot,
  OrdersByTable,
  PaidOrdersByTable,
  PaymentMethod,
  PreparationBoardColumn,
  PreparationBoardColumnId,
  PreparationFlow,
  PreparationMoveResult,
  Product,
  TableOrder,
} from '../models/restaurant-pos.models';
import { RestaurantFloorStore } from './restaurant-floor.store';

const COURSE_SERVICE_ORDER: OrderCourse[] = ['drinks', 'starter', 'main', 'dessert', 'other'];
const KITCHEN_BOARD_STATUSES: KitchenBoardStatus[] = ['sent_to_kitchen', 'preparing', 'ready'];
const PREPARATION_BOARD_COLUMNS: PreparationBoardColumnId[] = ['pending', 'preparing', 'ready'];

export type OrderError =
  | 'restaurantPos.errors.selectTableFirst'
  | 'restaurantPos.errors.productUnavailable';

@Injectable({ providedIn: 'root' })
export class RestaurantOrderStore {
  private readonly floor = inject(RestaurantFloorStore);
  private readonly menu = inject(MenuMockService);
  private readonly menuPricing = inject(MenuPricingService);
  private readonly menuValidation = inject(MenuValidationService);

  private readonly _ordersByTable = signal<OrdersByTable>({});
  private readonly _paidOrdersByTable = signal<PaidOrdersByTable>({});
  private readonly _backendProducts = signal<Product[] | null>(null);

  readonly ordersByTable = this._ordersByTable.asReadonly();
  readonly paidOrdersByTable = this._paidOrdersByTable.asReadonly();
  readonly products = computed(() => this._backendProducts() ?? this.menu.products());

  readonly occupiedTables = computed(
    () => this.floor.servicePoints().filter((sp) => this.isOccupied(sp.table.status)).length,
  );
  readonly activeOrders = computed(
    () => Object.values(this._ordersByTable()).filter((o) => o.lines.length > 0 && o.status !== 'paid').length,
  );
  readonly kitchenQueue = computed(
    () => Object.values(this._ordersByTable()).filter((o) => o.lines.some((l) => this.isKitchenLine(l))).length,
  );
  readonly kitchenTickets = computed<KitchenOrderTicket[]>(() =>
    Object.values(this._ordersByTable())
      .filter((o) => o.lines.some((l) => this.isKitchenLine(l)))
      .map((o) => {
        const table = this.floor.restaurantTables().find((t) => t.id === o.tableId);
        if (!table) return null;
        return {
          table,
          servicePoint: this.floor.floorElements().find((el) => el.tableId === table.id) ?? null,
          lines: o.lines.filter((l) => this.isKitchenLine(l)),
        };
      })
      .filter((t): t is KitchenOrderTicket => t !== null),
  );
  readonly kitchenBoardColumns = computed<KitchenBoardColumn[]>(() =>
    KITCHEN_BOARD_STATUSES.map((status) => ({
      status,
      tickets: this.kitchenTickets()
        .map((ticket) => ({ ...ticket, lines: ticket.lines.filter((l) => l.status === status) }))
        .filter((ticket) => ticket.lines.length > 0),
    })),
  );
  readonly preparationBoardColumns = computed<PreparationBoardColumn[]>(() => {
    const cards = this.buildPreparationBoardCards();
    return PREPARATION_BOARD_COLUMNS.map((id) => ({
      id,
      cards: cards.filter((c) => this.getPreparationColumnId(c.line.status) === id),
    }));
  });
  readonly servedPreparationCards = computed<PreparationBoardColumn['cards']>(() =>
    this.buildPreparationBoardCards().filter((c) => c.line.status === 'served'),
  );
  readonly salesToday = computed(() =>
    this.round(this.floor.restaurantTables().reduce((sum, t) => sum + t.total, 0)),
  );
  readonly averageTicket = computed(() => {
    const orders = Object.values(this._ordersByTable()).filter((o) => o.total > 0);
    return orders.length === 0 ? 0 : this.round(this.salesToday() / orders.length);
  });

  clearOrders(): void {
    this._ordersByTable.set({});
    this._paidOrdersByTable.set({});
  }

  hydrateProducts(products: Product[]): void {
    this._backendProducts.set(products);
  }

  hydrateServicePointOrder(tableId: string, order: TableOrder | null): void {
    const incoming = order ?? this.createEmptyOrder(tableId);
    const current = untracked(() => this._ordersByTable()[tableId]);
    if (JSON.stringify(current) === JSON.stringify(incoming)) return;
    this._ordersByTable.update((map) => ({ ...map, [tableId]: structuredClone(incoming) }));
  }

  initializeOrdersForTables(tables: { id: string }[], existing: OrdersByTable): void {
    const next = tables.reduce<OrdersByTable>(
      (acc, t) => ({ ...acc, [t.id]: existing[t.id] ?? this.createEmptyOrder(t.id) }),
      {},
    );
    this._ordersByTable.set(next);
    this._paidOrdersByTable.update((history) =>
      tables.reduce<PaidOrdersByTable>((acc, table) => ({ ...acc, [table.id]: history[table.id] ?? [] }), {}),
    );
  }

  removeTableOrder(tableId: string): void {
    this._ordersByTable.update(({ [tableId]: _removed, ...rest }) => rest);
    this._paidOrdersByTable.update(({ [tableId]: _removed, ...rest }) => rest);
  }

  createEmptyOrder(tableId: string): TableOrder {
    return { tableId, lines: [], total: 0, status: 'open', paymentMethod: 'pending' };
  }

  addProductToTable(tableId: string, productId: string): OrderError | null {
    const product = this.products().find((p) => p.id === productId);
    const defaultOptionIds = product ? this.getDefaultModifierOptionIds(product) : [];
    return this.addCustomizedProductToTable(tableId, productId, defaultOptionIds);
  }

  addCustomizedProductToTable(
    tableId: string,
    productId: string,
    selectedModifierOptionIds: string[] = [],
    kitchenNote = '',
  ): OrderError | null {
    const product = this.products().find((p) => p.id === productId);
    if (!product?.available) return 'restaurantPos.errors.productUnavailable';
    const validation = this.menuValidation.validateCustomization(product, selectedModifierOptionIds, this.menu.modifierGroups());
    if (!validation.valid) return 'restaurantPos.errors.productUnavailable';
    const order = this.ensureOrder(tableId);
    const table = this.floor.getTable(tableId);
    const now = this.nowIso();
    const selectedModifiers = this.menuPricing.buildSelectedModifiers(product, selectedModifierOptionIds, this.menu.modifierGroups());
    const unitPrice = this.menuPricing.calculateCustomizedProductPrice(product, selectedModifiers);
    const configurationSignature = this.menuPricing.createConfigurationSignature(product.id, selectedModifierOptionIds, kitchenNote);
    const lineId = this.createOrderLineId(order.lines, configurationSignature);
    const normalizedKitchenNote = kitchenNote.trim();
    const productSnapshot = this.createProductSnapshot(product);
    const nextLines = this.addProductLine(order.lines, {
      id: lineId,
      productSnapshot,
      productId: productSnapshot.productId,
      productName: productSnapshot.productName,
      quantity: 1,
      basePrice: productSnapshot.basePrice,
      selectedModifiers,
      ...(product.type === 'platter' && product.platterComponents?.length ? { platterComponents: structuredClone(product.platterComponents) } : {}),
      ...(normalizedKitchenNote ? { kitchenNote: normalizedKitchenNote, note: normalizedKitchenNote } : {}),
      unitPrice,
      subtotal: unitPrice,
      configurationSignature,
      course: productSnapshot.course,
      status: 'pending',
    });
    const total = this.calculateOrderTotal(nextLines);
    this.setOrder(tableId, { ...order, lines: nextLines, total });
    this.floor.updateTable(tableId, {
      status: table?.status === 'waiting_kitchen' ? 'waiting_kitchen' : 'occupied',
      total,
      occupiedAt: table?.occupiedAt ?? now,
      serviceStartedAt: table?.serviceStartedAt ?? now,
      cleaningStartedAt: undefined,
    });
    return null;
  }

  addConfiguredComboToTable(tableId: string, comboProductId: string, slotSelections: ComboSlotSelection[]): OrderError | null {
    const comboProduct = this.products().find((p) => p.id === comboProductId);
    const comboDef = comboProduct ? this.getComboDefinition(comboProduct) : null;
    if (!comboProduct?.available || comboProduct.type !== 'combo' || !comboDef) {
      return 'restaurantPos.errors.productUnavailable';
    }
    const normalized = this.normalizeComboSelections(slotSelections);
    const validation = this.menuValidation.validateCombo(comboDef, normalized, this.products());
    if (!validation.valid) return 'restaurantPos.errors.productUnavailable';
    const order = this.ensureOrder(tableId);
    const table = this.floor.getTable(tableId);
    const now = this.nowIso();
    const unitPrice = this.menuPricing.calculateComboTotalPrice(comboProduct, comboDef, normalized);
    const configSig = this.menuPricing.createComboConfigurationSignature(comboProduct.id, normalized);
    const lineId = this.createOrderLineId(order.lines, configSig);
    const selectedComboSlots = this.buildSelectedComboSlotsSnapshot(comboDef, normalized);
    const productSnapshot = this.createProductSnapshot(comboProduct, this.deriveComboPreparationPolicy(comboProduct, selectedComboSlots));
    const nextLines = this.addProductLine(order.lines, {
      id: lineId,
      productSnapshot,
      productId: productSnapshot.productId,
      productName: productSnapshot.productName,
      quantity: 1,
      basePrice: productSnapshot.basePrice,
      selectedModifiers: [],
      selectedComboSlots,
      unitPrice,
      subtotal: unitPrice,
      configurationSignature: configSig,
      course: productSnapshot.course,
      status: 'pending',
    });
    const total = this.calculateOrderTotal(nextLines);
    this.setOrder(tableId, { ...order, lines: nextLines, total });
    this.floor.updateTable(tableId, {
      status: table?.status === 'waiting_kitchen' ? 'waiting_kitchen' : 'occupied',
      total,
      occupiedAt: table?.occupiedAt ?? now,
      serviceStartedAt: table?.serviceStartedAt ?? now,
      cleaningStartedAt: undefined,
    });
    return null;
  }

  increaseOrderLine(tableId: string, lineIdOrProductId: string): OrderError | null {
    const order = this._ordersByTable()[tableId];
    const existing = order ? this.findOrderLine(order, lineIdOrProductId) : null;
    if (!existing) return this.addProductToTable(tableId, lineIdOrProductId);
    if (existing.selectedComboSlots?.length) {
      return this.addConfiguredComboToTable(tableId, existing.productId, this.comboSelectionsFromOrderLine(existing));
    }
    return this.addCustomizedProductToTable(
      tableId,
      existing.productId,
      existing.selectedModifiers.map((m) => m.optionId),
      existing.kitchenNote,
    );
  }

  adjustOrderLineQuantityById(tableId: string, lineId: string, delta: number): void {
    const order = this.ensureOrder(tableId);
    const existing = order.lines.find((line) => line.id === lineId);
    if (!existing || delta === 0) return;
    const nextQuantity = existing.quantity + delta;
    const nextLines =
      nextQuantity <= 0
        ? order.lines.filter((line) => line.id !== lineId)
        : order.lines.map((line) =>
            line.id === lineId
              ? { ...line, quantity: nextQuantity, subtotal: this.round(nextQuantity * line.unitPrice) }
              : line,
          );
    const total = this.calculateOrderTotal(nextLines);
    this.setOrder(tableId, { ...order, lines: nextLines, total });
    this.floor.updateTable(tableId, { total });
  }

  decreaseOrderLine(tableId: string, lineIdOrProductId: string): void {
    const order = this.ensureOrder(tableId);
    const existing = this.findOrderLine(order, lineIdOrProductId);
    if (!existing) return;
    const nextLines =
      existing.quantity <= 1
        ? order.lines.filter((l) => l.id !== existing.id)
        : order.lines.map((l) =>
            l.id === existing.id ? { ...l, quantity: l.quantity - 1, subtotal: this.round((l.quantity - 1) * l.unitPrice) } : l,
          );
    const total = this.calculateOrderTotal(nextLines);
    this.setOrder(tableId, { ...order, lines: nextLines, total });
    this.floor.updateTable(tableId, { total });
  }

  removeOrderLine(tableId: string, lineIdOrProductId: string): void {
    const order = this.ensureOrder(tableId);
    const existing = this.findOrderLine(order, lineIdOrProductId);
    const nextLines = existing ? order.lines.filter((l) => l.id !== existing.id) : order.lines;
    const total = this.calculateOrderTotal(nextLines);
    this.setOrder(tableId, { ...order, lines: nextLines, total });
    this.floor.updateTable(tableId, { total });
  }

  updateOrderLineNote(tableId: string, lineIdOrProductId: string, note: string): void {
    const normalized = note.trim();
    this.updateOrderLine(tableId, lineIdOrProductId, (l) => ({
      ...l,
      ...(normalized ? { note: normalized, kitchenNote: normalized } : { note: undefined, kitchenNote: undefined }),
    }));
  }

  occupyTable(tableId: string): void {
    const table = this.floor.getTable(tableId);
    const now = this.nowIso();
    this.floor.updateTable(tableId, {
      status: 'occupied',
      occupiedAt: table?.occupiedAt ?? now,
      serviceStartedAt: table?.serviceStartedAt ?? now,
      cleaningStartedAt: undefined,
    });
  }

  sendOrderToKitchen(tableId: string): OrderError | null {
    const order = this.ensureOrder(tableId);
    if (order.lines.length === 0) return 'restaurantPos.errors.selectTableFirst';
    this.applyOrderStatus(tableId, order, 'sent_to_kitchen', 'waiting_kitchen');
    return null;
  }

  markOrderServed(tableId: string): void {
    const order = this.ensureOrder(tableId);
    this.applyOrderStatus(tableId, order, 'served', 'served');
  }

  chargeTable(tableId: string): void {
    const order = this.ensureOrder(tableId);
    const paidOrder = structuredClone({
      ...order,
      status: 'paid' as const,
      lines: this.updateLinesForStatus(order.lines, 'paid'),
    });

    this._paidOrdersByTable.update((history) => ({
      ...history,
      [tableId]: [...(history[tableId] ?? []), paidOrder],
    }));
    this.setOrder(tableId, this.createEmptyOrder(tableId));
    this.floor.updateTable(tableId, {
      status: 'paid',
      total: 0,
      cleaningStartedAt: undefined,
    });
  }

  /**
   * Marca el pedido actual como pagado tras la confirmación del backend: archiva una
   * copia en el histórico de pagos y mantiene el pedido visible en estado 'paid'
   * (a diferencia de chargeTable, que vacía la mesa en el flujo demo).
   */
  markOrderPaid(tableId: string, method: PaymentMethod): void {
    const order = this.ensureOrder(tableId);
    const paidOrder: TableOrder = {
      ...order,
      status: 'paid',
      paymentMethod: method,
      lines: this.updateLinesForStatus(order.lines, 'paid'),
    };
    this._paidOrdersByTable.update((history) => ({
      ...history,
      [tableId]: [...(history[tableId] ?? []), structuredClone(paidOrder)],
    }));
    this.setOrder(tableId, paidOrder);
    this.floor.updateTable(tableId, { status: 'paid', cleaningStartedAt: undefined });
  }

  markPaymentPending(tableId: string): void {
    const order = this.ensureOrder(tableId);
    this.applyOrderStatus(tableId, order, 'payment_pending', 'payment_pending');
  }

  freeTable(tableId: string): void {
    this.setOrder(tableId, { tableId, lines: [], total: 0, status: 'open', paymentMethod: 'pending' });
    this.floor.updateTable(tableId, { status: 'free', total: 0, occupiedAt: undefined, serviceStartedAt: undefined, cleaningStartedAt: undefined });
  }

  markTableForCleaning(tableId: string): void {
    this.floor.updateTable(tableId, { status: 'cleaning', cleaningStartedAt: this.nowIso() });
  }

  setPaymentMethod(tableId: string, method: PaymentMethod): void {
    const order = this.ensureOrder(tableId);
    this.setOrder(tableId, { ...order, paymentMethod: method });
  }

  markOrderLinePreparing(tableId: string, lineIdOrProductId: string): void {
    this.updateOrderLine(tableId, lineIdOrProductId, (l) => {
      if (l.status !== 'sent_to_kitchen') return l;
      const now = this.nowIso();
      return { ...l, status: 'preparing', sentToKitchenAt: l.sentToKitchenAt ?? now, preparingAt: l.preparingAt ?? now };
    });
  }

  markOrderLineReady(tableId: string, lineIdOrProductId: string): void {
    this.updateOrderLine(tableId, lineIdOrProductId, (l) => {
      if (l.status === 'served') return l;
      const now = this.nowIso();
      return { ...l, status: 'ready', sentToKitchenAt: l.sentToKitchenAt ?? now, preparingAt: l.preparingAt ?? now, readyAt: l.readyAt ?? now };
    });
  }

  markOrderLineServed(tableId: string, lineIdOrProductId: string): void {
    this.updateOrderLine(tableId, lineIdOrProductId, (l) => {
      const now = this.nowIso();
      return {
        ...l,
        status: 'served',
        sentToKitchenAt: l.sentToKitchenAt ?? now,
        preparingAt: l.preparingAt ?? now,
        readyAt: l.readyAt ?? now,
        pickedUpAt: l.pickedUpAt,
        servedAt: l.servedAt ?? now,
      };
    });
    this.syncTableStatusAfterLineUpdate(tableId);
  }

  markOrderLineReadyForTable(tableId: string, lineIdOrProductId: string): void {
    this.updateOrderLine(tableId, lineIdOrProductId, (l) => {
      if (l.status === 'served') return l;
      const now = this.nowIso();
      return { ...l, status: 'ready', sentToKitchenAt: l.sentToKitchenAt ?? now, preparingAt: l.preparingAt ?? now, readyAt: l.readyAt ?? now };
    });
  }

  moveOrderLineBackInKitchen(tableId: string, lineIdOrProductId: string): void {
    this.updateOrderLine(tableId, lineIdOrProductId, (l) => {
      if (l.status === 'ready') return { ...l, status: 'preparing', readyAt: undefined };
      if (l.status === 'preparing') return { ...l, status: 'sent_to_kitchen', preparingAt: undefined, readyAt: undefined };
      return l;
    });
  }

  archiveOrderLineFromKitchen(tableId: string, lineIdOrProductId: string): void {
    this.updateOrderLine(tableId, lineIdOrProductId, (l) => {
      if (l.status !== 'ready') return l;
      const now = this.nowIso();
      return {
        ...l,
        status: 'picked_up',
        sentToKitchenAt: l.sentToKitchenAt ?? now,
        preparingAt: l.preparingAt ?? now,
        readyAt: l.readyAt ?? now,
        pickedUpAt: l.pickedUpAt ?? now,
      };
    });
  }

  movePreparationLine(tableId: string, lineIdOrProductId: string, targetColumn: PreparationBoardColumnId): PreparationMoveResult {
    const order = this._ordersByTable()[tableId];
    const line = order ? this.findOrderLine(order, lineIdOrProductId) : null;
    if (!line) return { moved: false, reason: 'missing_line' };
    if (targetColumn === 'preparing') {
      this.updateOrderLine(tableId, line.id, (l) => {
        if (l.status === 'served' || l.status === 'cancelled') return l;
        const now = this.nowIso();
        return { ...l, status: 'preparing', sentToKitchenAt: l.sentToKitchenAt ?? now, preparingAt: l.preparingAt ?? now, readyAt: undefined, pickedUpAt: undefined };
      });
      return { moved: true };
    }
    if (targetColumn === 'ready') {
      this.markOrderLineReady(tableId, line.id);
      return { moved: true };
    }
    if (targetColumn === 'pending') {
      this.updateOrderLine(tableId, line.id, (l) => {
        if (l.status !== 'preparing') return l;
        return { ...l, status: 'sent_to_kitchen', preparingAt: undefined };
      });
      return { moved: true };
    }
    return { moved: false, reason: 'unsupported_target' };
  }

  cancelPreparationLine(tableId: string, lineIdOrProductId: string): void {
    this.updateOrderLine(tableId, lineIdOrProductId, (l) => {
      if (l.status !== 'served') return l;
      return { ...l, status: 'cancelled' };
    });
  }

  getOrder(tableId: string): TableOrder | undefined {
    return this._ordersByTable()[tableId];
  }

  ensureOrder(tableId: string): TableOrder {
    return this._ordersByTable()[tableId] ?? this.createEmptyOrder(tableId);
  }

  private setOrder(tableId: string, order: TableOrder): void {
    this._ordersByTable.update((map) => ({ ...map, [tableId]: order }));
  }

  updateOrderLine(tableId: string, lineIdOrProductId: string, updater: (l: OrderLine) => OrderLine): void {
    const order = this.ensureOrder(tableId);
    const existing = this.findOrderLine(order, lineIdOrProductId);
    this.setOrder(tableId, {
      ...order,
      lines: order.lines.map((l) => (existing && l.id === existing.id ? updater(l) : l)),
    });
  }

  findOrderLine(order: TableOrder, lineIdOrProductId: string): OrderLine | null {
    return (
      order.lines.find((l) => l.id === lineIdOrProductId) ??
      order.lines.find((l) => l.configurationSignature === lineIdOrProductId) ??
      order.lines.find((l) => l.productId === lineIdOrProductId) ??
      null
    );
  }

  private applyOrderStatus(
    tableId: string,
    order: TableOrder,
    orderStatus: TableOrder['status'],
    tableStatus: import('../models/restaurant-pos.models').TableStatus,
  ): void {
    this.setOrder(tableId, { ...order, status: orderStatus, lines: this.updateLinesForStatus(order.lines, orderStatus) });
    this.floor.updateTable(tableId, {
      status: tableStatus,
      ...(tableStatus === 'payment_pending' ? {} : { cleaningStartedAt: undefined }),
    });
  }

  private updateLinesForStatus(lines: OrderLine[], orderStatus: TableOrder['status']): OrderLine[] {
    if (orderStatus === 'sent_to_kitchen') {
      const now = this.nowIso();
      return lines.map((l) => (l.status === 'pending' ? { ...l, status: 'sent_to_kitchen', sentToKitchenAt: now } : l));
    }
    if (orderStatus === 'served') {
      const now = this.nowIso();
      return lines.map((l) => ({
        ...l,
        status: 'served',
        sentToKitchenAt: l.sentToKitchenAt ?? now,
        preparingAt: l.preparingAt ?? now,
        readyAt: l.readyAt ?? now,
        pickedUpAt: l.pickedUpAt,
        servedAt: l.servedAt ?? now,
      }));
    }
    return lines;
  }

  private addProductLine(lines: OrderLine[], next: OrderLine): OrderLine[] {
    const existing = lines.find((l) => l.configurationSignature === next.configurationSignature && l.status === 'pending');
    if (!existing) return [...lines, next];
    return lines.map((l) =>
      l.id === existing.id
        ? {
            ...l,
            quantity: l.quantity + 1,
            subtotal: this.round((l.quantity + 1) * l.unitPrice),
          }
        : l,
    );
  }

  private calculateOrderTotal(lines: OrderLine[]): number {
    return this.round(lines.reduce((sum, l) => sum + l.subtotal, 0));
  }

  private syncTableStatusAfterLineUpdate(tableId: string): void {
    const order = this.ensureOrder(tableId);
    if (order.lines.length > 0 && order.lines.every((l) => l.status === 'served')) {
      this.setOrder(tableId, { ...order, status: 'served' });
      this.floor.updateTable(tableId, { status: 'served' });
    }
  }

  private buildPreparationBoardCards(): PreparationBoardColumn['cards'] {
    return Object.values(this._ordersByTable())
      .filter((o) => o.lines.length > 0 && o.status !== 'paid')
      .flatMap((o) => {
        const table = this.floor.restaurantTables().find((t) => t.id === o.tableId);
        if (!table) return [];
        return o.lines
          .filter((l) => this.isVisibleInPreparationBoard(l, table.status))
          .map((l) => {
            const flow = this.getPreparationFlow(l);
            return {
              tableId: o.tableId,
              tableNumber: table.number,
              line: l,
              preparationFlow: flow,
              requiresReadyBeforeServed: flow === 'kitchen',
              fromCustomerApp: o.clientOrigin === 'apk-customer',
              ...(flow === 'kitchen' ? { station: 'Cocina' } : {}),
            };
          });
      });
  }

  private getPreparationColumnId(status: OrderLine['status']): PreparationBoardColumnId | null {
    if (status === 'ready' || status === 'picked_up') return 'ready';
    if (status === 'preparing') return 'preparing';
    if (status === 'sent_to_kitchen' || status === 'pending') return 'pending';
    return null;
  }

  private isVisibleInPreparationBoard(
    line: OrderLine,
    tableStatus: import('../models/restaurant-pos.models').TableStatus,
  ): boolean {
    if (line.status === 'cancelled') return false;
    if (line.status === 'pending') return tableStatus === 'waiting_kitchen';
    return true;
  }

  private getPreparationFlow(line: OrderLine): PreparationFlow {
    return line.productSnapshot.preparationPolicy.requiresReadyBeforeServe ? 'kitchen' : 'direct';
  }

  private isKitchenLine(line: OrderLine): boolean {
    return line.status === 'sent_to_kitchen' || line.status === 'preparing' || line.status === 'ready';
  }

  private isOccupied(status: import('../models/restaurant-pos.models').TableStatus): boolean {
    return status !== 'free' && status !== 'reserved';
  }

  private createProductSnapshot(product: Product, preparationPolicy = product.preparationPolicy): OrderLineProductSnapshot {
    return {
      productId: product.id,
      productName: product.name,
      ...(product.imageUrl ? { imageUrl: product.imageUrl } : {}),
      productType: product.type,
      basePrice: product.basePrice,
      course: product.course,
      preparationPolicy: { ...preparationPolicy },
    };
  }

  private getComboDefinition(combo: Product): ComboProductDefinition | null {
    return this.menu.comboProductDefinitions().find((d) => d.productId === combo.id) ?? null;
  }

  private normalizeComboSelections(slots: ComboSlotSelection[]): ComboSlotSelection[] {
    return slots
      .map((s) => ({ slotId: s.slotId, selectedProductIds: [...new Set(s.selectedProductIds)].sort() }))
      .sort((a, b) => a.slotId.localeCompare(b.slotId));
  }

  private buildSelectedComboSlotsSnapshot(
    def: ComboProductDefinition,
    selections: ComboSlotSelection[],
  ): NonNullable<OrderLine['selectedComboSlots']> {
    const productsById = new Map(this.products().map((p) => [p.id, p]));
    const suppMap = new Map(def.supplements.map((s) => [`${s.slotId}:${s.productId}`, s.supplementPrice]));
    return def.slots
      .map((slot) => {
        const sel = selections.find((s) => s.slotId === slot.id);
        const selectedProducts = (sel?.selectedProductIds ?? [])
          .map((id) => {
            const p = productsById.get(id);
            return p
              ? { productId: p.id, productName: p.name, productType: p.type, course: p.course, preparationPolicy: { ...p.preparationPolicy }, supplementPrice: suppMap.get(`${slot.id}:${p.id}`) ?? 0 }
              : null;
          })
          .filter((p): p is NonNullable<typeof p> => p !== null);
        return { slotId: slot.id, slotName: slot.name, selectedProducts };
      })
      .filter((s) => s.selectedProducts.length > 0);
  }

  private deriveComboPreparationPolicy(
    combo: Product,
    slots: NonNullable<OrderLine['selectedComboSlots']>,
  ): OrderLineProductSnapshot['preparationPolicy'] {
    const needsReady = slots.some((s) => s.selectedProducts.some((p) => p.preparationPolicy.requiresReadyBeforeServe));
    return needsReady ? { route: 'kitchen', requiresReadyBeforeServe: true } : { ...combo.preparationPolicy, requiresReadyBeforeServe: false };
  }

  private comboSelectionsFromOrderLine(line: OrderLine): ComboSlotSelection[] {
    return (line.selectedComboSlots ?? []).map((s) => ({
      slotId: s.slotId,
      selectedProductIds: s.selectedProducts.map((p) => p.productId),
    }));
  }

  private getDefaultModifierOptionIds(product: Product): string[] {
    return this.menuPricing
      .getModifierGroupsForProduct(product, this.menu.modifierGroups())
      .flatMap((g) => g.options.filter((o) => o.selectedByDefault).map((o) => o.id));
  }

  private createOrderLineId(lines: OrderLine[], sig: string): string {
    const mergeCandidate = lines.find((line) => line.configurationSignature === sig && line.status === 'pending');
    if (mergeCandidate) return mergeCandidate.id;

    const baseId = `line-${this.hashText(sig)}`;
    if (!lines.some((line) => line.id === baseId)) return baseId;

    let suffix = 2;
    while (lines.some((line) => line.id === `${baseId}-${suffix}`)) {
      suffix += 1;
    }

    return `${baseId}-${suffix}`;
  }

  private hashText(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return hash.toString(36);
  }

  private round(v: number): number {
    return Math.round(v * 100) / 100;
  }

  private nowIso(): string {
    return new Date().toISOString();
  }
}
