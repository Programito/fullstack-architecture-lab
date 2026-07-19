import { inject, Injectable } from '@angular/core';
import { switchMap, type Observable } from 'rxjs';
import type { ComboSlotSelection } from '../../menu/models/menu.models';
import type { ModifierGroup } from '../../menu/models/modifier-group.model';
import { MenuMockService } from '../../menu/services/menu-mock.service';
import { mapServiceCourse, mapServicePointOrder } from '../api/restaurant-pos-api.mappers';
import type { AddRestaurantOrderLineRequest, ServicePointOrderDto } from '../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';
import type { OrderLine, Product, TableOrder } from '../models/restaurant-pos.models';
import { orderLineConfigurationIdentity, type OrderLineConfigurationIdentity } from '../models/order-line-grouping';
import { RestaurantContextStore } from './restaurant-context.store';
import { RestaurantFloorLoader } from './restaurant-floor-loader.service';
import { RestaurantPosStore } from './restaurant-pos.store';

@Injectable()
export class OrderWriteService {
  private readonly directSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly pendingDirectQuantities = new Map<string, Map<string, PendingDirectGroup>>();
  private readonly directSyncInFlight = new Set<string>();
  private readonly directSyncRetryRequested = new Set<string>();
  // Época de mutación local por mesa: cada mutación optimista la avanza. Una respuesta
  // remota lanzada con una época anterior se considera obsoleta y no debe pisar el estado.
  private readonly orderMutationEpochs = new Map<string, number>();
  private readonly lineMutationQueues = new Map<
    string,
    Array<{ mutation: () => Observable<unknown>; errorMessageKey: string; applyResponse?: (response: unknown) => void }>
  >();
  private readonly lineMutationInFlight = new Set<string>();
  private readonly lineMutationRefreshNeeded = new Set<string>();
  private readonly store = inject(RestaurantPosStore);
  private readonly api = inject(RestaurantPosApiService);
  private readonly context = inject(RestaurantContextStore);
  private readonly floorLoader = inject(RestaurantFloorLoader);
  private readonly menu = inject(MenuMockService);

  addProduct(productId: string): void {
    const product = this.store.products().find((p) => p.id === productId);
    if (!product) return;
    this.noteSelectedTableMutation();
    if (this.isDeferredDirectProduct(product)) {
      if (!this.canOptimisticallySync()) {
        return;
      }
      const tableId = this.store.selectedTableId();
      const beforeLineIds = new Set((tableId ? this.store.getOrder(tableId)?.lines : [])?.map((line) => line.id) ?? []);
      this.store.addProductToSelectedTable(productId);
      const addedLine = this.deferredDirectOrderLines(productId).find((line) => !beforeLineIds.has(line.id))
        ?? this.findDeferredDirectOrderLine(productId);
      if (addedLine) {
        this.queueDirectGroupSync(this.directGroupIdentity(addedLine));
      }
    } else if (product.restaurantProductId) {
      if (!this.canOptimisticallySync()) {
        return;
      }
      this.store.addProductToSelectedTable(productId);
      this.syncLineToBackend(productId, [], null);
    } else {
      this.store.addProductToSelectedTable(productId);
    }
  }

  addCustomizedProduct(productId: string, modifierOptionIds: string[], kitchenNote: string): void {
    const product = this.store.products().find((p) => p.id === productId);
    if (!product) return;
    this.noteSelectedTableMutation();
    if (product.restaurantProductId) {
      if (!this.canOptimisticallySync()) {
        return;
      }
      this.store.addCustomizedProductToSelectedTable(productId, modifierOptionIds, kitchenNote);
      this.syncLineToBackend(productId, modifierOptionIds, kitchenNote.trim() || null);
    } else {
      this.store.addCustomizedProductToSelectedTable(productId, modifierOptionIds, kitchenNote);
    }
  }

  addCombo(comboProductId: string, slotSelections: ComboSlotSelection[]): void {
    const product = this.store.products().find((p) => p.id === comboProductId);
    if (!product) return;
    this.noteSelectedTableMutation();
    if (product.restaurantProductId) {
      if (!this.canOptimisticallySync()) {
        return;
      }
      this.store.addConfiguredComboToSelectedTable(comboProductId, slotSelections);
      this.syncComboToBackend(comboProductId, slotSelections);
    } else {
      this.store.addConfiguredComboToSelectedTable(comboProductId, slotSelections);
    }
  }

  increaseDirectProductQuantity(productId: string, sourceLineId?: string): void {
    const targetLine = this.findDeferredDirectOrderLine(productId, sourceLineId);
    if (!targetLine) return;
    const identity = this.directGroupIdentity(targetLine);
    this.noteSelectedTableMutation();
    this.store.adjustSelectedOrderLineQuantityById(targetLine.id, 1);
    this.queueDirectGroupSync(identity);
  }

  decreaseDirectProductQuantity(productId: string, sourceLineId?: string): void {
    const targetLine = this.findDeferredDirectOrderLine(productId, sourceLineId);
    if (!targetLine) return;
    const identity = this.directGroupIdentity(targetLine);
    this.noteSelectedTableMutation();
    this.store.adjustSelectedOrderLineQuantityById(targetLine.id, -1);
    this.queueDirectGroupSync(identity);
  }

  removeDirectProduct(productId: string, sourceLineId?: string): void {
    const sourceLine = this.findDeferredDirectOrderLine(productId, sourceLineId);
    if (!sourceLine) return;
    const identity = this.directGroupIdentity(sourceLine);
    const targetLines = this.deferredDirectOrderLines(productId).filter((line) => this.sameDirectGroup(line, identity));
    this.noteSelectedTableMutation();
    targetLines.forEach((line) => this.store.removeSelectedOrderLine(line.id));
    this.queueDirectGroupSync(identity);
  }

  flushPendingDirectProducts(): void {
    const tableId = this.store.selectedTableId();
    if (!tableId) return;
    this.startDirectSync(tableId);
  }

  /**
   * Aplica un pedido recibido del backend sobre el estado local.
   *
   * Si se indica `expectedEpoch` (la época capturada al lanzar la petición GET), la
   * hidratación se descarta cuando hubo mutaciones locales posteriores: la respuesta
   * es una foto antigua y pisarla provocaría el efecto "elimino y reaparece".
   */
  hydrateRemoteOrder(tableId: string, order: TableOrder | null, expectedEpoch?: number): void {
    if (expectedEpoch !== undefined && expectedEpoch !== this.orderMutationEpoch(tableId)) {
      return;
    }
    this.store.hydrateServicePointOrder(
      tableId,
      this.overlayPendingDirectQuantities(tableId, order, this.pendingDirectQuantities.get(tableId) ?? new Map()),
    );
  }

  /** Marca que acaba de producirse una mutación local optimista del pedido de la mesa. */
  noteLocalOrderMutation(tableId: string): void {
    this.orderMutationEpochs.set(tableId, this.orderMutationEpoch(tableId) + 1);
  }

  orderMutationEpoch(tableId: string): number {
    return this.orderMutationEpochs.get(tableId) ?? 0;
  }

  /**
   * Encola una mutación de línea (add/update/delete) para ejecutarla en serie por mesa.
   * Al vaciarse la cola se recarga el pedido una vez, protegido por época, en lugar de
   * disparar un GET por mutación que puede volver desordenado.
   */
  enqueueLineMutation(
    tableId: string,
    restaurantId: string,
    mutation: () => Observable<unknown>,
    options?: { errorMessageKey?: string; applyResponse?: (response: unknown) => void },
  ): void {
    const queue = this.lineMutationQueues.get(tableId) ?? [];
    queue.push({
      mutation,
      errorMessageKey: options?.errorMessageKey ?? 'restaurantPos.errors.updateLineFailed',
      ...(options?.applyResponse ? { applyResponse: options.applyResponse } : {}),
    });
    this.lineMutationQueues.set(tableId, queue);
    if (!this.lineMutationInFlight.has(tableId)) {
      this.drainLineMutations(tableId, restaurantId);
    }
  }

  refreshRemoteOrder(restaurantId: string, tableId: string): void {
    const expectedEpoch = this.orderMutationEpoch(tableId);
    this.api.getRestaurantServicePointOrder(restaurantId, tableId).subscribe({
      next: (serviceOrder) => this.hydrateRemoteOrder(tableId, mapServicePointOrder(serviceOrder), expectedEpoch),
      error: () => undefined,
    });
  }

  private drainLineMutations(tableId: string, restaurantId: string): void {
    const entry = this.lineMutationQueues.get(tableId)?.shift();
    if (!entry) {
      this.lineMutationInFlight.delete(tableId);
      // Si toda la tanda aplicó su propia respuesta, esa respuesta es la verdad más
      // reciente: un GET extra podría volver con una foto anterior y resucitar líneas.
      if (this.lineMutationRefreshNeeded.delete(tableId)) {
        this.refreshRemoteOrder(restaurantId, tableId);
      }
      return;
    }
    this.lineMutationInFlight.add(tableId);
    entry.mutation().subscribe({
      next: (result) => {
        if (entry.applyResponse) {
          entry.applyResponse(result);
          // La respuesta aplicada cuenta como verdad local nueva: descarta GETs en vuelo.
          this.noteLocalOrderMutation(tableId);
        } else {
          this.lineMutationRefreshNeeded.add(tableId);
        }
        this.drainLineMutations(tableId, restaurantId);
      },
      error: () => {
        this.store.reportApiError(entry.errorMessageKey);
        this.lineMutationRefreshNeeded.add(tableId);
        this.drainLineMutations(tableId, restaurantId);
      },
    });
  }

  private noteSelectedTableMutation(): void {
    const tableId = this.store.selectedTableId();
    if (tableId) {
      this.noteLocalOrderMutation(tableId);
    }
  }

  private canOptimisticallySync(): boolean {
    return !!this.context.activeRestaurant() && !!this.store.selectedTableId();
  }

  private isDeferredDirectProduct(product: Product): boolean {
    return product.type === 'simple' && product.modifierGroupIds.length === 0 && !!product.restaurantProductId;
  }

  private queueDirectGroupSync(identity: DirectLineGroupIdentity): void {
    const tableId = this.store.selectedTableId();
    if (!tableId || !this.canOptimisticallySync()) return;

    const desiredQuantity = this.currentDirectGroupQuantity(tableId, identity);
    const pendingGroups = this.pendingDirectQuantities.get(tableId) ?? new Map<string, PendingDirectGroup>();
    pendingGroups.set(this.directGroupKey(identity), { identity, desiredQuantity });
    this.pendingDirectQuantities.set(tableId, pendingGroups);

    const existingTimer = this.directSyncTimers.get(tableId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    if (this.directSyncInFlight.has(tableId)) {
      this.directSyncRetryRequested.add(tableId);
      return;
    }

    this.directSyncTimers.set(
      tableId,
      setTimeout(() => {
        this.directSyncTimers.delete(tableId);
        this.startDirectSync(tableId);
      }, 350),
    );
  }

  private startDirectSync(tableId: string): void {
    const pendingGroups = this.pendingDirectQuantities.get(tableId);
    const restaurant = this.context.activeRestaurant();
    if (!pendingGroups || pendingGroups.size === 0 || !restaurant) return;
    if (this.directSyncInFlight.has(tableId)) return;

    const existingTimer = this.directSyncTimers.get(tableId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.directSyncTimers.delete(tableId);
    }

    this.directSyncInFlight.add(tableId);
    this.api.getRestaurantServicePointOrder(restaurant.id, tableId).subscribe({
      next: (serviceOrder) => this.syncDirectProductDifferences(tableId, restaurant.id, serviceOrder),
      error: () => this.handleDirectSyncError(tableId, restaurant.id),
    });
  }

  private syncDirectProductDifferences(tableId: string, restaurantId: string, serviceOrder: ServicePointOrderDto): void {
    const pendingGroups = new Map(this.pendingDirectQuantities.get(tableId) ?? []);
    const operations = this.buildDirectSyncOperations(pendingGroups, serviceOrder);

    this.executeDirectSyncOperations(tableId, restaurantId, serviceOrder.order?.id ?? null, operations, () => {
      const expectedEpoch = this.orderMutationEpoch(tableId);
      this.api.getRestaurantServicePointOrder(restaurantId, tableId).subscribe({
        next: (latestServiceOrder) => {
          const latestMappedOrder = mapServicePointOrder(latestServiceOrder);
          this.hydrateRemoteOrder(tableId, latestMappedOrder, expectedEpoch);
          this.clearSatisfiedDirectSyncs(tableId, latestServiceOrder);
          this.finishDirectSync(tableId);
        },
        error: () => this.handleDirectSyncError(tableId, restaurantId),
      });
    });
  }

  private executeDirectSyncOperations(
    tableId: string,
    restaurantId: string,
    orderId: string | null,
    operations: DirectSyncOperation[],
    onComplete: () => void,
  ): void {
    if (operations.length === 0) {
      onComplete();
      return;
    }

    const [currentOperation, ...remainingOperations] = operations;

    if (currentOperation.type === 'delete') {
      this.api.deleteRestaurantOrderLine(restaurantId, currentOperation.orderId, currentOperation.lineId).subscribe({
        next: () => this.executeDirectSyncOperations(tableId, restaurantId, orderId, remainingOperations, onComplete),
        error: () => this.handleDirectSyncError(tableId, restaurantId),
      });
      return;
    }

    if (currentOperation.type === 'update') {
      this.api
        .updateRestaurantOrderLine(restaurantId, currentOperation.orderId, currentOperation.lineId, { quantity: currentOperation.quantity })
        .subscribe({
          next: () => this.executeDirectSyncOperations(tableId, restaurantId, orderId, remainingOperations, onComplete),
          error: () => this.handleDirectSyncError(tableId, restaurantId),
        });
      return;
    }

    this.ensureOrderId(restaurantId, tableId, orderId, (resolvedOrderId) => {
      if (!resolvedOrderId) {
        this.handleDirectSyncError(tableId, restaurantId);
        return;
      }

      this.api.addRestaurantOrderLine(restaurantId, resolvedOrderId, currentOperation.request).subscribe({
        next: () => this.executeDirectSyncOperations(tableId, restaurantId, resolvedOrderId, remainingOperations, onComplete),
        error: () => this.handleDirectSyncError(tableId, restaurantId),
      });
    });
  }

  private ensureOrderId(
    restaurantId: string,
    tableId: string,
    orderId: string | null,
    onResolved: (orderId: string | null) => void,
  ): void {
    if (orderId) {
      onResolved(orderId);
      return;
    }

    this.api.openRestaurantOrder(restaurantId, tableId, 1).subscribe({
      next: (orderDto) => onResolved(orderDto.order.id),
      error: () => this.handleDirectSyncError(tableId, restaurantId),
    });
  }

  private buildDirectSyncOperations(
    pendingGroups: Map<string, PendingDirectGroup>,
    serviceOrder: ServicePointOrderDto,
  ): DirectSyncOperation[] {
    const operations: DirectSyncOperation[] = [];
    const backendLines = serviceOrder.lines.filter((line) => this.isDeferredDirectProductLine(line));

    pendingGroups.forEach(({ identity, desiredQuantity }) => {
      const productId = identity.productId;
      const product = this.store.products().find((candidate) => candidate.id === productId);
      const restaurantProductId = product?.restaurantProductId;
      if (!product || !restaurantProductId) {
        return;
      }

      const matchingLines = backendLines.filter((line) => this.matchesBackendDirectGroup(line, identity));
      const [primaryLine, ...duplicateLines] = matchingLines;

      if (!primaryLine) {
        if (desiredQuantity <= 0) {
          return;
        }
        operations.push({
          type: 'add',
          request: {
            restaurantProductId,
            quantity: desiredQuantity,
            kitchenNote: null,
            modifiers: [],
            comboSlots: [],
            platterComponents: [],
          },
        });
        return;
      }

      duplicateLines.forEach((line) => {
        operations.push({
          type: 'delete',
          orderId: serviceOrder.order!.id,
          lineId: line.id,
        });
      });

      if (desiredQuantity <= 0) {
        operations.push({
          type: 'delete',
          orderId: serviceOrder.order!.id,
          lineId: primaryLine.id,
        });
        return;
      }

      if (primaryLine.quantity !== desiredQuantity || duplicateLines.length > 0) {
        operations.push({
          type: 'update',
          orderId: serviceOrder.order!.id,
          lineId: primaryLine.id,
          quantity: desiredQuantity,
        });
      }
    });

    return operations;
  }

  private overlayPendingDirectQuantities(
    tableId: string,
    order: TableOrder | null,
    pendingGroups: Map<string, PendingDirectGroup>,
  ): TableOrder | null {
    if (!order || pendingGroups.size === 0) {
      return order;
    }

    const localOrder = this.store.getOrder(tableId);
    if (!localOrder) {
      return order;
    }

    const nextOrder: TableOrder = {
      ...order,
      lines: [...order.lines],
    };

    pendingGroups.forEach(({ identity, desiredQuantity }) => {
      const localLine = localOrder.lines.find(
        (line) => this.isDeferredDirectOrderLine(line) && this.sameDirectGroup(line, identity),
      );
      let hasMatchingLine = false;

      nextOrder.lines = nextOrder.lines.flatMap((line) => {
        if (!(this.isDeferredDirectOrderLine(line) && this.sameDirectGroup(line, identity))) {
          return [line];
        }
        if (hasMatchingLine) {
          return [];
        }
        hasMatchingLine = true;
        if (desiredQuantity <= 0 || !localLine) {
          return [];
        }
        return [{
          ...localLine,
          quantity: desiredQuantity,
          subtotal: this.round(localLine.unitPrice * desiredQuantity),
        }];
      });

      if (!hasMatchingLine && desiredQuantity > 0 && localLine) {
        nextOrder.lines.push({
          ...localLine,
          quantity: desiredQuantity,
          subtotal: this.round(localLine.unitPrice * desiredQuantity),
        });
      }
    });

    nextOrder.total = this.round(nextOrder.lines.reduce((sum, line) => sum + line.subtotal, 0));
    return nextOrder;
  }

  private clearSatisfiedDirectSyncs(tableId: string, serviceOrder: ServicePointOrderDto): void {
    const pendingGroups = this.pendingDirectQuantities.get(tableId);
    if (!pendingGroups) {
      return;
    }

    pendingGroups.forEach(({ identity, desiredQuantity }, groupKey) => {
      const backendQuantity = serviceOrder.lines
        .filter((line) => this.isDeferredDirectProductLine(line) && this.matchesBackendDirectGroup(line, identity))
        .reduce((sum, line) => sum + line.quantity, 0);

      if (backendQuantity === desiredQuantity) {
        pendingGroups.delete(groupKey);
      }
    });

    if (pendingGroups.size === 0) {
      this.pendingDirectQuantities.delete(tableId);
      return;
    }

    this.pendingDirectQuantities.set(tableId, pendingGroups);
  }

  private finishDirectSync(tableId: string): void {
    this.directSyncInFlight.delete(tableId);
    if (this.directSyncRetryRequested.has(tableId)) {
      this.directSyncRetryRequested.delete(tableId);
      this.startDirectSync(tableId);
    }
  }

  private handleDirectSyncError(tableId: string, restaurantId: string): void {
    this.directSyncInFlight.delete(tableId);
    if (!this.isCurrentRestaurant(restaurantId)) return;

    this.store.reportApiError('restaurantPos.errors.addLineFailed');
    this.api.getRestaurantServicePointOrder(restaurantId, tableId).subscribe((serviceOrder) => {
      if (!this.isCurrentRestaurant(restaurantId)) return;
      this.hydrateRemoteOrder(tableId, mapServicePointOrder(serviceOrder));
    });
    this.floorLoader.refresh(restaurantId).subscribe();
  }

  private isCurrentRestaurant(restaurantId: string): boolean {
    return this.context.activeRestaurant()?.id === restaurantId;
  }

  private currentDirectGroupQuantity(tableId: string, identity: DirectLineGroupIdentity): number {
    const order = this.store.getOrder(tableId);
    return (order?.lines ?? [])
      .filter((line) => this.isDeferredDirectOrderLine(line) && this.sameDirectGroup(line, identity))
      .reduce((sum, line) => sum + line.quantity, 0);
  }

  private isDeferredDirectOrderLine(line: OrderLine): boolean {
    return (
      line.productSnapshot.productType === 'simple' &&
      line.status === 'pending' &&
      !line.kitchenNote &&
      !line.note &&
      line.selectedModifiers.length === 0 &&
      (line.selectedComboSlots?.length ?? 0) === 0 &&
      (line.platterComponents?.length ?? 0) === 0
    );
  }

  private isDeferredDirectProductLine(line: ServicePointOrderDto['lines'][number]): boolean {
    return (
      line.productType === 'simple' &&
      line.status === 'pending' &&
      line.modifiers.length === 0 &&
      line.comboSlots.length === 0 &&
      !line.kitchenNote
    );
  }

  private deferredDirectOrderLines(productId: string): OrderLine[] {
    const tableId = this.store.selectedTableId();
    if (!tableId) return [];
    const canonicalProductId = this.canonicalProductId(productId);
    return (this.store.getOrder(tableId)?.lines ?? []).filter(
      (line) =>
        this.canonicalProductId(line.productId) === canonicalProductId && this.isDeferredDirectOrderLine(line),
    );
  }

  private findDeferredDirectOrderLine(productId: string, sourceLineId?: string): OrderLine | null {
    const lines = this.deferredDirectOrderLines(productId);
    if (sourceLineId) {
      return lines.find((line) => line.id === sourceLineId) ?? null;
    }
    return lines[0] ?? null;
  }

  private directGroupIdentity(line: OrderLine): DirectLineGroupIdentity {
    return {
      productId: this.canonicalProductId(line.productId),
      configuration: this.classifyLocalConfiguration(line),
      course: line.course,
      unitPriceCents: Math.round(line.unitPrice * 100),
      status: 'pending',
    };
  }

  private sameDirectGroup(line: OrderLine, identity: DirectLineGroupIdentity): boolean {
    return this.directGroupKey(this.directGroupIdentity(line)) === this.directGroupKey(identity);
  }

  private directGroupKey(identity: DirectLineGroupIdentity): string {
    return [
      identity.productId,
      identity.configuration.kind,
      identity.configuration.kind === 'exact' ? identity.configuration.value : '',
      identity.course,
      identity.unitPriceCents,
      identity.status,
    ].join('\u001f');
  }

  /**
   * Las firmas locales vacías (`productId::::`), las remotas vacías
   * (`restaurantProductId|`) y `service-config:<productId>` representan una única
   * configuración canónica por defecto. El último formato es el fallback sintético
   * del mapper para backend legacy sin firma; no puede competir con otro grupo.
   */
  private classifyLocalConfiguration(line: OrderLine): OrderLineConfigurationIdentity {
    const product = this.store.products().find(
      (candidate) => candidate.id === line.productId || candidate.restaurantProductId === line.productId,
    );
    const identifiers = [line.productId, product?.restaurantProductId].filter((value): value is string => !!value);
    return orderLineConfigurationIdentity(line.configurationSignature, identifiers);
  }

  private matchesBackendDirectGroup(
    line: ServicePointOrderDto['lines'][number],
    identity: DirectLineGroupIdentity,
  ): boolean {
    if (
      !this.matchesDirectProductLine(line, identity.productId)
      || mapServiceCourse(line.course) !== identity.course
      || line.unitPriceCents !== identity.unitPriceCents
    ) {
      return false;
    }

    if (identity.configuration.kind === 'default') {
      const product = this.store.products().find((candidate) => candidate.id === identity.productId);
      const identifiers = [identity.productId, product?.restaurantProductId, line.productId, line.restaurantProductId]
        .filter((value): value is string => !!value);
      return orderLineConfigurationIdentity(line.configurationSignature, identifiers).kind === 'default';
    }

    return line.configurationSignature === identity.configuration.value;
  }

  private canonicalProductId(productId: string): string {
    return this.store.products().find(
      (product) => product.id === productId || product.restaurantProductId === productId,
    )?.id ?? productId;
  }

  private matchesDirectProductLine(line: ServicePointOrderDto['lines'][number], productId: string): boolean {
    const restaurantProductId = this.store.products().find((product) => product.id === productId)?.restaurantProductId;
    return line.productId === productId || (!!restaurantProductId && line.restaurantProductId === restaurantProductId);
  }

  private syncLineToBackend(
    productId: string,
    modifierOptionIds: string[],
    kitchenNote: string | null,
  ): void {
    const product = this.store.products().find((p) => p.id === productId);
    const restaurantProductId = product?.restaurantProductId;
    if (!restaurantProductId) return;

    this.syncOrderLine({
      restaurantProductId,
      quantity: 1,
      kitchenNote,
      modifiers: this.buildModifiersRequest(product.modifierGroupIds, modifierOptionIds),
      comboSlots: [],
      platterComponents: [],
    });
  }

  private syncComboToBackend(comboProductId: string, slotSelections: ComboSlotSelection[]): void {
    const product = this.store.products().find((p) => p.id === comboProductId);
    const restaurantProductId = product?.restaurantProductId;
    if (!restaurantProductId) return;

    this.syncOrderLine({
      restaurantProductId,
      quantity: 1,
      kitchenNote: null,
      modifiers: [],
      comboSlots: this.buildComboSlotsRequest(slotSelections),
      platterComponents: [],
    });
  }

  private syncOrderLine(request: AddRestaurantOrderLineRequest): void {
    const restaurant = this.context.activeRestaurant();
    const tableId = this.store.selectedTableId();
    if (!restaurant || !tableId) return;

    // La mutación entra en la cola serializada de la mesa: se ejecuta cuando le toca,
    // resolviendo el orderId en ese momento, y el refresco único al vaciarse la cola
    // (protegido por época) sustituye al GET por mutación que llegaba desordenado.
    this.enqueueLineMutation(
      tableId,
      restaurant.id,
      () => {
        const orderId = this.store.selectedOrder()?.id;
        const add$ = (oid: string) => this.api.addRestaurantOrderLine(restaurant.id, oid, request);
        return orderId
          ? add$(orderId)
          : this.api.openRestaurantOrder(restaurant.id, tableId, 1).pipe(switchMap((orderDto) => add$(orderDto.order.id)));
      },
      { errorMessageKey: 'restaurantPos.errors.addLineFailed' },
    );
  }

  private buildModifiersRequest(
    productModifierGroupIds: string[],
    selectedOptionIds: string[],
  ): AddRestaurantOrderLineRequest['modifiers'] {
    if (!selectedOptionIds.length) return [];
    const groups = this.menu.modifierGroups() as ModifierGroup[];
    return productModifierGroupIds.flatMap((groupId) => {
      const group = groups.find((g) => g.id === groupId);
      if (!group) return [];
      return selectedOptionIds
        .filter((optId) => group.options.some((o) => o.id === optId))
        .map((optId) => ({ modifierGroupId: groupId, modifierOptionId: optId, quantity: 1 }));
    });
  }

  private buildComboSlotsRequest(
    slotSelections: ComboSlotSelection[],
  ): AddRestaurantOrderLineRequest['comboSlots'] {
    return slotSelections.flatMap((sel) =>
      sel.selectedProductIds.flatMap((selectedId) => {
        const selectedProduct = this.store.products().find((p) => p.id === selectedId);
        const restaurantProductId = selectedProduct?.restaurantProductId;
        if (!restaurantProductId) return [];
        return [{ comboSlotId: sel.slotId, restaurantProductId, quantity: 1 }];
      }),
    );
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

type DirectSyncOperation =
  | { type: 'add'; request: AddRestaurantOrderLineRequest }
  | { type: 'update'; orderId: string; lineId: string; quantity: number }
  | { type: 'delete'; orderId: string; lineId: string };

interface DirectLineGroupIdentity {
  productId: string;
  configuration: OrderLineConfigurationIdentity;
  course: OrderLine['course'];
  unitPriceCents: number;
  status: 'pending';
}

interface PendingDirectGroup {
  identity: DirectLineGroupIdentity;
  desiredQuantity: number;
}
