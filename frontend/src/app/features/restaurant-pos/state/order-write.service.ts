import { inject, Injectable } from '@angular/core';
import { switchMap } from 'rxjs';
import type { ComboSlotSelection } from '../../menu/models/menu.models';
import type { ModifierGroup } from '../../menu/models/modifier-group.model';
import { MenuMockService } from '../../menu/services/menu-mock.service';
import { mapServiceFloor, mapServicePointOrder } from '../api/restaurant-pos-api.mappers';
import type { AddRestaurantOrderLineRequest } from '../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../api/restaurant-pos-api.service';
import { RestaurantContextStore } from './restaurant-context.store';
import { RestaurantPosStore } from './restaurant-pos.store';

@Injectable()
export class OrderWriteService {
  private readonly store = inject(RestaurantPosStore);
  private readonly api = inject(RestaurantPosApiService);
  private readonly context = inject(RestaurantContextStore);
  private readonly menu = inject(MenuMockService);

  addProduct(productId: string): void {
    const product = this.store.products().find((p) => p.id === productId);
    if (!product) return;
    if (product.restaurantProductId) {
      this.syncLineToBackend(productId, [], null);
    } else {
      this.store.addProductToSelectedTable(productId);
    }
  }

  addCustomizedProduct(productId: string, modifierOptionIds: string[], kitchenNote: string): void {
    const product = this.store.products().find((p) => p.id === productId);
    if (!product) return;
    if (product.restaurantProductId) {
      this.syncLineToBackend(productId, modifierOptionIds, kitchenNote.trim() || null);
    } else {
      this.store.addCustomizedProductToSelectedTable(productId, modifierOptionIds, kitchenNote);
    }
  }

  addCombo(comboProductId: string, slotSelections: ComboSlotSelection[]): void {
    const product = this.store.products().find((p) => p.id === comboProductId);
    if (!product) return;
    if (product.restaurantProductId) {
      this.syncComboToBackend(comboProductId, slotSelections);
    } else {
      this.store.addConfiguredComboToSelectedTable(comboProductId, slotSelections);
    }
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
        this.store.hydrateServicePointOrder(tableId, mapServicePointOrder(serviceOrder));
      },
      error: () => {
        this.store.reportApiError('restaurantPos.errors.addLineFailed');
        this.api.getRestaurantServicePointOrder(restaurant.id, tableId).subscribe((serviceOrder) => {
          this.store.hydrateServicePointOrder(tableId, mapServicePointOrder(serviceOrder));
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
}
