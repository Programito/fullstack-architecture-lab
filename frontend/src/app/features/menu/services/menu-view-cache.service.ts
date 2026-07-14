import { Injectable } from '@angular/core';

import type { ModifierGroup } from '../models/modifier-group.model';
import type { MenuData, RestaurantProductDetailDto, RestaurantProductSummaryDto } from './menu-api.service';
import { mapRestaurantProductDetailToCachedMenuProduct, mapRestaurantProductDetailToCatalogSummary } from '../utils/menu-product-mappers';

export type MenuViewCacheSnapshot = {
  menuData: MenuData;
  catalogProducts: RestaurantProductSummaryDto[];
  sharedModifierGroups: ModifierGroup[];
};

@Injectable({ providedIn: 'root' })
export class MenuViewCacheService {
  private snapshot: MenuViewCacheSnapshot | null = null;

  getSnapshot(): MenuViewCacheSnapshot | null {
    return this.snapshot;
  }

  setSnapshot(snapshot: MenuViewCacheSnapshot): void {
    this.snapshot = snapshot;
  }

  clear(): void {
    this.snapshot = null;
  }

  patchEditedProduct(product: RestaurantProductDetailDto, categoryId: string | null): void {
    if (!this.snapshot) return;

    const current = this.snapshot;

    this.snapshot = {
      menuData: {
        ...current.menuData,
        products: current.menuData.products.map((candidate) =>
          candidate.restaurantProductId === product.id
            ? mapRestaurantProductDetailToCachedMenuProduct(product, candidate, categoryId)
            : candidate,
        ),
      },
      catalogProducts: current.catalogProducts.map((candidate) =>
        candidate.id === product.id ? mapRestaurantProductDetailToCatalogSummary(product, candidate) : candidate,
      ),
      sharedModifierGroups: current.sharedModifierGroups,
    };
  }
}
