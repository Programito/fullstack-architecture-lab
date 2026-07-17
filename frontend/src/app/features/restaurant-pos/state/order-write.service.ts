import { inject, Injectable } from '@angular/core';
import { switchMap } from 'rxjs';
import type { ComboSlotSelection } from '../../menu/models/menu.models';
import type { ModifierGroup } from '../../menu/models/modifier-group.model';
import { MenuMockService } from '../../menu/services/menu-mock.service';
import { mapServiceFloor, mapServicePointOrder } from '../api/restaurant-pos-api.mappers';
import type { AddRestaurantOrderLineRequest, ServicePointOrderDto } from '../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';
import type { OrderLine, Product, TableOrder } from '../models/restaurant-pos.models';
import { RestaurantContextStore } from './restaurant-context.store';
import { RestaurantPosStore } from './restaurant-pos.store';

@Injectable()
export class OrderWriteService {
  private readonly directSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly pendingDirectQuantities = new Map<string, Map<string, number>>();
  private readonly directSyncInFlight = new Set<string>();
  private readonly directSyncRetryRequested = new Set<string>();
  private readonly store = inject(RestaurantPosStore);
  private readonly api = inject(RestaurantPosApiService);
  private readonly context = inject(RestaurantContextStore);
  private readonly menu = inject(MenuMockService);

  addProduct(productId: string): void {
    const product = this.store.products().find((p) => p.id === productId);
    if (!product) return;
    if (this.isDeferredDirectProduct(product)) {
      if (!this.canOptimisticallySync()) {
        return;
      }
      this.store.addProductToSelectedTable(productId);
      this.queueDirectProductSync(productId);
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

  increaseDirectProductQuantity(productId: string): void {
    this.store.increaseSelectedOrderLine(productId);
    this.queueDirectProductSync(productId);
  }

  decreaseDirectProductQuantity(productId: string): void {
    this.store.decreaseSelectedOrderLine(productId);
    this.queueDirectProductSync(productId);
  }

  removeDirectProduct(productId: string): void {
    this.store.removeSelectedOrderLine(productId);
    this.queueDirectProductSync(productId);
  }

  flushPendingDirectProducts(): void {
    const tableId = this.store.selectedTableId();
    if (!tableId) return;
    this.startDirectSync(tableId);
  }

  hydrateRemoteOrder(tableId: string, order: TableOrder | null): void {
    this.store.hydrateServicePointOrder(
      tableId,
      this.overlayPendingDirectQuantities(tableId, order, this.pendingDirectQuantities.get(tableId) ?? new Map()),
    );
  }

  private canOptimisticallySync(): boolean {
    return !!this.context.activeRestaurant() && !!this.store.selectedTableId();
  }

  private isDeferredDirectProduct(product: Product): boolean {
    return product.type === 'simple' && product.modifierGroupIds.length === 0 && !!product.restaurantProductId;
  }

  private queueDirectProductSync(productId: string): void {
    const tableId = this.store.selectedTableId();
    if (!tableId || !this.canOptimisticallySync()) return;

    const desiredQuantity = this.currentDirectProductQuantity(tableId, productId);
    const pendingProducts = this.pendingDirectQuantities.get(tableId) ?? new Map<string, number>();
    pendingProducts.set(productId, desiredQuantity);
    this.pendingDirectQuantities.set(tableId, pendingProducts);

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
    const pendingProducts = this.pendingDirectQuantities.get(tableId);
    const restaurant = this.context.activeRestaurant();
    if (!pendingProducts || pendingProducts.size === 0 || !restaurant) return;
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
    const pendingProducts = new Map(this.pendingDirectQuantities.get(tableId) ?? []);
    const operations = this.buildDirectSyncOperations(pendingProducts, serviceOrder);

    this.executeDirectSyncOperations(tableId, restaurantId, serviceOrder.order?.id ?? null, operations, () => {
      this.api.getRestaurantServicePointOrder(restaurantId, tableId).subscribe({
        next: (latestServiceOrder) => {
          const latestMappedOrder = mapServicePointOrder(latestServiceOrder);
          this.hydrateRemoteOrder(tableId, latestMappedOrder);
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
    pendingProducts: Map<string, number>,
    serviceOrder: ServicePointOrderDto,
  ): DirectSyncOperation[] {
    const operations: DirectSyncOperation[] = [];
    const backendLines = serviceOrder.lines.filter((line) => this.isDeferredDirectProductLine(line));

    pendingProducts.forEach((desiredQuantity, productId) => {
      const product = this.store.products().find((candidate) => candidate.id === productId);
      const restaurantProductId = product?.restaurantProductId;
      if (!product || !restaurantProductId) {
        return;
      }

      const matchingLines = backendLines.filter((line) => (line.productId ?? line.restaurantProductId) === productId);
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
    pendingProducts: Map<string, number>,
  ): TableOrder | null {
    if (!order || pendingProducts.size === 0) {
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

    pendingProducts.forEach((desiredQuantity, productId) => {
      nextOrder.lines = nextOrder.lines.filter((line) => !(this.isDeferredDirectOrderLine(line) && line.productId === productId));

      if (desiredQuantity <= 0) {
        return;
      }

      const localLine = localOrder.lines.find((line) => this.isDeferredDirectOrderLine(line) && line.productId === productId);
      if (!localLine) {
        return;
      }

      nextOrder.lines.push({
        ...localLine,
        quantity: desiredQuantity,
        subtotal: this.round(localLine.unitPrice * desiredQuantity),
      });
    });

    nextOrder.total = this.round(nextOrder.lines.reduce((sum, line) => sum + line.subtotal, 0));
    return nextOrder;
  }

  private clearSatisfiedDirectSyncs(tableId: string, serviceOrder: ServicePointOrderDto): void {
    const pendingProducts = this.pendingDirectQuantities.get(tableId);
    if (!pendingProducts) {
      return;
    }

    pendingProducts.forEach((desiredQuantity, productId) => {
      const backendQuantity = serviceOrder.lines
        .filter((line) => this.isDeferredDirectProductLine(line) && (line.productId ?? line.restaurantProductId) === productId)
        .reduce((sum, line) => sum + line.quantity, 0);

      if (backendQuantity === desiredQuantity) {
        pendingProducts.delete(productId);
      }
    });

    if (pendingProducts.size === 0) {
      this.pendingDirectQuantities.delete(tableId);
      return;
    }

    this.pendingDirectQuantities.set(tableId, pendingProducts);
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
    this.store.reportApiError('restaurantPos.errors.addLineFailed');
    this.api.getRestaurantServicePointOrder(restaurantId, tableId).subscribe((serviceOrder) => {
      this.hydrateRemoteOrder(tableId, mapServicePointOrder(serviceOrder));
    });
    this.api.getRestaurantServiceFloor(restaurantId).subscribe((serviceFloor) => {
      this.store.hydrateServiceFloor(mapServiceFloor(serviceFloor));
    });
  }

  private currentDirectProductQuantity(tableId: string, productId: string): number {
    const order = this.store.getOrder(tableId);
    return (order?.lines ?? [])
      .filter((line) => this.isDeferredDirectOrderLine(line) && line.productId === productId && line.status !== 'cancelled')
      .reduce((sum, line) => sum + line.quantity, 0);
  }

  private isDeferredDirectOrderLine(line: OrderLine): boolean {
    return line.productSnapshot.productType === 'simple' && line.selectedModifiers.length === 0 && !(line.selectedComboSlots?.length);
  }

  private isDeferredDirectProductLine(line: ServicePointOrderDto['lines'][number]): boolean {
    return line.productType === 'simple' && line.modifiers.length === 0 && line.comboSlots.length === 0 && !line.kitchenNote;
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

    const orderId = this.store.selectedOrder()?.id;

    const addAndReload$ = (oid: string) =>
      this.api.addRestaurantOrderLine(restaurant.id, oid, request).pipe(
        switchMap(() => this.api.getRestaurantServicePointOrder(restaurant.id, tableId)),
      );

    const source$ = orderId
      ? addAndReload$(orderId)
      : this.api.openRestaurantOrder(restaurant.id, tableId, 1).pipe(
          switchMap((orderDto) => addAndReload$(orderDto.order.id)),
        );

    source$.subscribe({
      next: (serviceOrder) => {
        this.hydrateRemoteOrder(tableId, mapServicePointOrder(serviceOrder));
      },
      error: () => {
        this.store.reportApiError('restaurantPos.errors.addLineFailed');
        this.api.getRestaurantServicePointOrder(restaurant.id, tableId).subscribe((serviceOrder) => {
          this.hydrateRemoteOrder(tableId, mapServicePointOrder(serviceOrder));
        });
        this.api.getRestaurantServiceFloor(restaurant.id).subscribe((serviceFloor) => {
          this.store.hydrateServiceFloor(mapServiceFloor(serviceFloor));
        });
      },
    });
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
