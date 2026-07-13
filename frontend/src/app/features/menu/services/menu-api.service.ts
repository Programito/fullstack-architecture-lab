import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';

import type {
  ComboSlotAdminDto,
  CreateComboSlotRequest,
  CreateModifierGroupRequest,
  CreatePlatterComponentRequest,
  CreateRestaurantProductRequest,
  MenuSectionAdminDto,
  PlatterComponentAdminDto,
  RestaurantMenuComboSlotDto,
  RestaurantMenuDto,
  RestaurantMenuItemDto,
  RestaurantMenuModifierGroupDto,
  RestaurantMenuPlatterComponentDto,
  RestaurantProductDetailDto,
  RestaurantProductSummaryDto,
  UpdateComboSlotRequest,
  UpdateModifierGroupRequest,
  UpdatePlatterComponentRequest,
  UpdateRestaurantProductRequest,
} from '../../restaurant-pos/api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../../restaurant-pos/api/restaurant-pos-api.service';
import { RestaurantContextStore } from '../../restaurant-pos/state/restaurant-context.store';
import { deriveModifierGroupDisplayType } from '../models/modifier-group.model';
import type { ComboProductDefinition, MenuCategory, ModifierGroup, NameI18n, Product } from '../models/menu.models';
import type { ProductCourse, ProductPreparationRoute } from '../models/product.model';

export type MenuData = {
  menuId: string;
  categories: MenuCategory[];
  products: Product[];
  modifierGroups: ModifierGroup[];
  comboProductDefinitions: ComboProductDefinition[];
};

export type {
  ComboSlotAdminDto,
  CreateComboSlotRequest,
  CreateModifierGroupRequest,
  CreatePlatterComponentRequest,
  CreateRestaurantProductRequest,
  MenuSectionAdminDto,
  PlatterComponentAdminDto,
  RestaurantMenuComboSlotDto,
  RestaurantMenuModifierGroupDto,
  RestaurantMenuPlatterComponentDto,
  RestaurantProductDetailDto,
  RestaurantProductSummaryDto,
  UpdateComboSlotRequest,
  UpdateRestaurantProductRequest,
  UpdatePlatterComponentRequest,
};

// Datos crudos (combo slots / platter components) del producto tal y como los devuelve el
// endpoint de lectura GET /restaurants/:id/menu — no hay endpoint admin de lectura dedicado
// (ver docs/superpowers/plans/2026-07-12-combo-platter-admin.md, Fase 3), así que el editor
// reutiliza este de solo-lectura para precargar. Ojo: `RestaurantMenuComboSlotOptionDto` no
// incluye `isDefault` ni `RestaurantMenuPlatterComponentDto` incluye `componentProductId`/
// `quantity` (no son necesarios para el carrito) — el editor no puede precargar esos campos.
export type ComboOrPlatterMenuData = {
  comboSlots: RestaurantMenuComboSlotDto[];
  platterComponents: RestaurantMenuPlatterComponentDto[];
};

@Injectable({ providedIn: 'root' })
export class MenuApiService {
  private readonly api = inject(RestaurantPosApiService);
  private readonly context = inject(RestaurantContextStore);

  private get restaurantId(): string {
    const id = this.context.activeRestaurant()?.id;
    if (!id) throw new Error('No active restaurant');
    return id;
  }

  getMenu(): Observable<MenuData> {
    return this.api.getRestaurantMenu(this.restaurantId).pipe(map(mapApiMenuToMenuData));
  }

  toggleAvailability(restaurantProductId: string, available: boolean): Observable<void> {
    return this.api.setMenuItemAvailability(this.restaurantId, restaurantProductId, available);
  }

  /**
   * Publica/oculta un producto ya colocado en una sección, sin tocar su disponibilidad
   * ("agotado"). Distinto de [toggleAvailability]: esto decide si aparece en la app en absoluto.
   */
  setItemVisibility(menuId: string, sectionId: string, itemId: string, visible: boolean): Observable<void> {
    return this.api
      .updateMenuSectionItem(this.restaurantId, menuId, sectionId, itemId, { isVisible: visible })
      .pipe(map(() => undefined));
  }

  createSection(menuId: string, name: string, isVisible = true, nameI18n?: NameI18n): Observable<MenuSectionAdminDto> {
    return this.api.createMenuSection(this.restaurantId, menuId, { name, isVisible, ...(nameI18n ? { nameI18n } : {}) });
  }

  updateSection(menuId: string, sectionId: string, data: { name?: string; isVisible?: boolean; nameI18n?: NameI18n }): Observable<MenuSectionAdminDto> {
    return this.api.updateMenuSection(this.restaurantId, menuId, sectionId, data);
  }

  deleteSection(menuId: string, sectionId: string): Observable<void> {
    return this.api.deleteMenuSection(this.restaurantId, menuId, sectionId);
  }

  listProducts(): Observable<RestaurantProductSummaryDto[]> {
    return this.api.listRestaurantProducts(this.restaurantId);
  }

  addSectionItem(menuId: string, sectionId: string, restaurantProductId: string): Observable<void> {
    return this.api.addMenuSectionItem(this.restaurantId, menuId, sectionId, { restaurantProductId }).pipe(map(() => undefined));
  }

  removeSectionItem(menuId: string, sectionId: string, itemId: string): Observable<void> {
    return this.api.removeMenuSectionItem(this.restaurantId, menuId, sectionId, itemId);
  }

  reorderSections(menuId: string, items: Array<{ id: string; sortOrder: number }>): Observable<void> {
    return this.api.reorderMenuSections(this.restaurantId, menuId, { items });
  }

  reorderSectionItems(menuId: string, sectionId: string, items: Array<{ id: string; sortOrder: number }>): Observable<void> {
    return this.api.reorderMenuSectionItems(this.restaurantId, menuId, sectionId, { items });
  }

  getProduct(productId: string): Observable<RestaurantProductDetailDto> {
    return this.api.getRestaurantProduct(this.restaurantId, productId);
  }

  createProduct(data: CreateRestaurantProductRequest): Observable<RestaurantProductDetailDto> {
    return this.api.createRestaurantProduct(this.restaurantId, data);
  }

  updateProduct(productId: string, data: UpdateRestaurantProductRequest): Observable<RestaurantProductDetailDto> {
    return this.api.updateRestaurantProduct(this.restaurantId, productId, data);
  }

  deleteProduct(productId: string): Observable<void> {
    return this.api.deleteRestaurantProduct(this.restaurantId, productId);
  }

  createModifierGroup(data: CreateModifierGroupRequest): Observable<ModifierGroup> {
    return this.api.createModifierGroup(this.restaurantId, data).pipe(map(mapModifierGroupDto));
  }

  updateModifierGroup(groupId: string, data: UpdateModifierGroupRequest): Observable<ModifierGroup> {
    return this.api.updateModifierGroup(this.restaurantId, groupId, data).pipe(map(mapModifierGroupDto));
  }

  deleteModifierGroup(groupId: string): Observable<void> {
    return this.api.deleteModifierGroup(this.restaurantId, groupId);
  }

  listModifierGroups(scope?: 'shared' | 'product'): Observable<ModifierGroup[]> {
    return this.api.listModifierGroups(this.restaurantId, scope).pipe(map((groups) => groups.map(mapModifierGroupDto)));
  }

  // ── Combo slots (admin) ─────────────────────────────────────────────────────

  createComboSlot(productId: string, data: CreateComboSlotRequest): Observable<ComboSlotAdminDto> {
    return this.api.createComboSlot(this.restaurantId, productId, data);
  }

  updateComboSlot(productId: string, slotId: string, data: UpdateComboSlotRequest): Observable<ComboSlotAdminDto> {
    return this.api.updateComboSlot(this.restaurantId, productId, slotId, data);
  }

  deleteComboSlot(productId: string, slotId: string): Observable<void> {
    return this.api.deleteComboSlot(this.restaurantId, productId, slotId);
  }

  // ── Platter components (admin) ──────────────────────────────────────────────

  createPlatterComponent(productId: string, data: CreatePlatterComponentRequest): Observable<PlatterComponentAdminDto> {
    return this.api.createPlatterComponent(this.restaurantId, productId, data);
  }

  updatePlatterComponent(productId: string, componentId: string, data: UpdatePlatterComponentRequest): Observable<PlatterComponentAdminDto> {
    return this.api.updatePlatterComponent(this.restaurantId, productId, componentId, data);
  }

  deletePlatterComponent(productId: string, componentId: string): Observable<void> {
    return this.api.deletePlatterComponent(this.restaurantId, productId, componentId);
  }

  /**
   * Combo slots / platter components actuales de un producto, leídos del menú (solo lectura).
   * Ver nota en `ComboOrPlatterMenuData` sobre los campos que no vienen en esta vía.
   */
  getComboOrPlatterData(restaurantProductId: string): Observable<ComboOrPlatterMenuData> {
    return this.api.getRestaurantMenu(this.restaurantId).pipe(
      map((dto) => {
        const item = dto.sections
          .flatMap((section) => section.items)
          .find((candidate) => (candidate.restaurantProductId ?? candidate.id) === restaurantProductId);
        return {
          comboSlots: item?.comboDefinition?.slots ?? [],
          platterComponents: item?.platterComponents ?? [],
        };
      }),
    );
  }
}

function mapApiMenuToMenuData(dto: RestaurantMenuDto): MenuData {
  const categories: MenuCategory[] = dto.sections.map((section, index) => ({
    id: section.id,
    name: section.name,
    nameI18n: section.nameI18n,
    sortOrder: section.sortOrder ?? (index + 1) * 10,
    isVisible: section.isVisible,
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

  const modifierGroups: ModifierGroup[] = [...modifierGroupMap.values()].map(mapModifierGroupDto);

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
          nameI18n: slot.nameI18n,
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

  return { menuId: dto.id, categories, products, modifierGroups, comboProductDefinitions };
}

function mapModifierGroupDto(mg: RestaurantMenuModifierGroupDto): ModifierGroup {
  return {
    id: mg.id,
    name: mg.name,
    nameI18n: mg.nameI18n,
    type: mg.selectionType,
    displayType: deriveModifierGroupDisplayType({
      type: mg.selectionType,
      options: mg.options.map((opt) => ({ priceDelta: opt.priceDeltaCents / 100 })),
    }),
    required: mg.isRequired,
    minSelections: mg.minSelections,
    maxSelections: mg.maxSelections,
    options: mg.options.map((opt) => ({
      id: opt.id,
      name: opt.name,
      nameI18n: opt.nameI18n,
      priceDelta: opt.priceDeltaCents / 100,
      imageUrl: opt.imageUrl ?? null,
    })),
    // scope/owner son necesarios para distinguir los grupos privados de producto (suplementos)
    // de los compartidos — p. ej. al precargar suplementos en el editor o al duplicar productos.
    ...(mg.scope ? { scope: mg.scope } : {}),
    ownerRestaurantProductId: mg.ownerRestaurantProductId ?? null,
  };
}

function mapApiItemToProduct(item: RestaurantMenuItemDto, categoryId: string): Product {
  const route = (item.preparationRoute ?? 'kitchen') as ProductPreparationRoute;
  return {
    id: item.id,
    restaurantProductId: item.restaurantProductId,
    name: item.name,
    nameI18n: item.nameI18n,
    ...(item.description ? { description: item.description } : {}),
    ...(item.descriptionI18n ? { descriptionI18n: item.descriptionI18n } : {}),
    imageUrl: item.imageUrl ?? null,
    categoryId,
    basePrice: item.priceCents / 100,
    price: item.priceCents / 100,
    // `isAvailable` viene combinada con `isVisible` (para no romper el filtrado de mobile);
    // el admin necesita el "agotado" y el "aparece en la app" como dos controles
    // independientes, así que usamos `productAvailable` (sin combinar) para el primero.
    available: item.productAvailable,
    visible: item.isVisible,
    allergens: item.allergens ?? [],
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
