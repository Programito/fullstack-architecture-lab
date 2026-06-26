import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';

import type {
  RestaurantMenuDto,
  RestaurantMenuItemDto,
  RestaurantMenuModifierGroupDto,
} from '../../restaurant-pos/api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../../restaurant-pos/api/restaurant-pos-api.service';
import type { ComboProductDefinition, MenuCategory, ModifierGroup, Product } from '../models/menu.models';
import type { ProductCourse, ProductPreparationRoute } from '../models/product.model';

export type MenuData = {
  categories: MenuCategory[];
  products: Product[];
  modifierGroups: ModifierGroup[];
  comboProductDefinitions: ComboProductDefinition[];
};

const RESTAURANT_ID = 'restaurant-mesaflow-centro';

@Injectable({ providedIn: 'root' })
export class MenuApiService {
  private readonly api = inject(RestaurantPosApiService);

  getMenu(): Observable<MenuData> {
    return this.api.getRestaurantMenu(RESTAURANT_ID).pipe(map(mapApiMenuToMenuData));
  }

  toggleAvailability(restaurantProductId: string, available: boolean): Observable<void> {
    return this.api.setMenuItemAvailability(RESTAURANT_ID, restaurantProductId, available);
  }
}

function mapApiMenuToMenuData(dto: RestaurantMenuDto): MenuData {
  const categories: MenuCategory[] = dto.sections.map((section, index) => ({
    id: section.id,
    name: section.name,
    sortOrder: section.sortOrder ?? (index + 1) * 10,
  }));

  const allItems = dto.sections.flatMap((section) =>
    section.items.map((item) => ({ item, sectionId: section.id })),
  );

  const restaurantProductIdToItemId = new Map<string, string>(
    allItems
      .filter(({ item }) => !!item.restaurantProductId)
      .map(({ item }) => [item.restaurantProductId!, item.id]),
  );

  const modifierGroupMap = new Map<string, RestaurantMenuModifierGroupDto>();
  for (const { item } of allItems) {
    for (const mg of item.modifierGroups) {
      modifierGroupMap.set(mg.id, mg);
    }
  }

  const modifierGroups: ModifierGroup[] = [...modifierGroupMap.values()].map((mg) => ({
    id: mg.id,
    name: mg.name,
    type: mg.selectionType,
    required: mg.isRequired,
    minSelections: mg.minSelections,
    maxSelections: mg.maxSelections,
    options: mg.options.map((opt) => ({
      id: opt.id,
      name: opt.name,
      priceDelta: opt.priceDeltaCents / 100,
    })),
  }));

  const products: Product[] = allItems.map(({ item, sectionId }) => mapApiItemToProduct(item, sectionId));

  const comboProductDefinitions: ComboProductDefinition[] = allItems
    .filter(({ item }) => item.productType === 'combo' && item.comboDefinition !== null)
    .map(({ item }) => {
      const combo = item.comboDefinition!;
      return {
        productId: item.id,
        pricingMode: 'base_plus_supplements',
        supplements: combo.slots.flatMap((slot) =>
          slot.options.map((opt) => ({
            slotId: slot.id,
            productId: restaurantProductIdToItemId.get(opt.restaurantProductId) ?? opt.restaurantProductId,
            supplementPrice: opt.supplementPriceCents / 100,
          })),
        ),
        slots: combo.slots.map((slot) => ({
          id: slot.id,
          name: slot.name,
          required: slot.isRequired,
          minSelections: slot.minSelections,
          maxSelections: slot.maxSelections,
          allowedProductIds: slot.options.map(
            (opt) => restaurantProductIdToItemId.get(opt.restaurantProductId) ?? opt.restaurantProductId,
          ),
          defaultProductId: slot.options
            .filter((opt) => opt.isAvailable)
            .map((opt) => restaurantProductIdToItemId.get(opt.restaurantProductId) ?? opt.restaurantProductId)[0],
        })),
      };
    });

  return { categories, products, modifierGroups, comboProductDefinitions };
}

function mapApiItemToProduct(item: RestaurantMenuItemDto, categoryId: string): Product {
  const route = (item.preparationRoute ?? 'kitchen') as ProductPreparationRoute;
  return {
    id: item.id,
    restaurantProductId: item.restaurantProductId,
    name: item.name,
    ...(item.description ? { description: item.description } : {}),
    categoryId,
    basePrice: item.priceCents / 100,
    price: item.priceCents / 100,
    available: item.isAvailable,
    allergens: [],
    course: toProductCourse(item.defaultCourse),
    type: item.productType,
    modifierGroupIds: item.modifierGroups.map((mg) => mg.id),
    preparationPolicy: {
      route,
      requiresReadyBeforeServe: route !== 'bar' && route !== 'direct',
    },
    ...(item.productType === 'combo' && item.comboDefinition
      ? { comboDefinitionId: item.comboDefinition.id }
      : {}),
    ...(item.productType === 'platter' && item.platterComponents.length > 0
      ? {
          platterComponents: item.platterComponents.map((pc) => ({
            id: pc.id,
            name: pc.name,
            removable: pc.removable,
            replaceable: pc.replaceable,
          })),
        }
      : {}),
  };
}

function toProductCourse(course: string | undefined): ProductCourse {
  if (course === 'drinks' || course === 'starter' || course === 'main' || course === 'dessert') {
    return course;
  }
  return 'other';
}
