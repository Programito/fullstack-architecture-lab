import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { RestaurantOrderCatalogRepository } from '../../application/ports/restaurant-order-catalog-repository.port';
import { applyDemoMenuTranslationFallback } from './demo-menu-translation-fallback';
import { asNameI18n } from './name-i18n.mapper';
import type {
  RestaurantMenu,
  RestaurantMenuComboDefinition,
  RestaurantMenuItem,
  RestaurantMenuModifierGroup,
  RestaurantMenuPlatterComponent,
} from '../../domain/restaurant-read.models';

type RawModifierOption = { id: string; name: string; nameI18n?: unknown; priceDeltaCents: number; isAvailable: boolean };
type RawModifierGroup = {
  modifierGroup: {
    id: string;
    name: string;
    nameI18n?: unknown;
    selectionType: string;
    minSelections: number;
    maxSelections: number;
    isRequired: boolean;
    options: RawModifierOption[];
  };
};
type RawComboSlotOption = {
  id: string;
  restaurantProductId: string;
  supplementPriceCents: number;
  isAvailable: boolean;
  restaurantProduct: { displayName: string | null; product: { name: string; nameI18n?: unknown } };
};
type RawComboSlot = {
  id: string;
  name: string;
  nameI18n?: unknown;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: RawComboSlotOption[];
};
type RawComboDefinition = { id: string; slots: RawComboSlot[] };
type RawPlatterComponent = { id: string; name: string; nameI18n?: unknown; isRemovable: boolean; isReplaceable: boolean; sortOrder: number };
type RawModifierOptionOverride = { modifierOptionId: string; priceDeltaCents: number };

type RawMenuItem = {
  id: string;
  displayNameOverride: string | null;
  priceOverrideCents: number | null;
  isVisible: boolean;
  restaurantProduct: {
    id: string;
    displayName: string | null;
    imageUrl: string | null;
    priceCents: number;
    currency: string;
    isAvailable: boolean;
    product: {
      id: string;
      name: string;
      nameI18n?: unknown;
      description: string | null;
      descriptionI18n?: unknown;
      productType: string;
      defaultCourse: string | null;
      defaultPreparationRoute: string | null;
      allergens: string[];
      taxRate: { name: string; ratePercent: { toString(): string } } | null;
      comboDefinition: RawComboDefinition | null;
      platterDefinition: { components: RawPlatterComponent[] } | null;
    };
    modifierGroups: RawModifierGroup[];
    modifierOptionOverrides: RawModifierOptionOverride[];
  };
};

@Injectable()
export class PrismaRestaurantOrderCatalogRepository implements RestaurantOrderCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async setItemAvailability(restaurantId: string, restaurantProductId: string, available: boolean): Promise<boolean> {
    const result = await this.prisma.restaurantProduct.updateMany({
      where: { id: restaurantProductId, restaurantId },
      data: { isAvailable: available },
    });
    return result.count > 0;
  }

  async findActiveMenu(restaurantId: string): Promise<RestaurantMenu | null> {
    const menu = await this.prisma.restaurantMenu.findFirst({
      where: { restaurantId, isActive: true },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            items: {
              orderBy: { sortOrder: 'asc' },
              include: {
                restaurantProduct: {
                  include: {
                    product: {
                      include: {
                        taxRate: { select: { name: true, ratePercent: true } },
                        comboDefinition: {
                          include: {
                            slots: {
                              orderBy: { sortOrder: 'asc' },
                              include: {
                                options: {
                                  orderBy: { sortOrder: 'asc' },
                                  include: {
                                    restaurantProduct: { include: { product: true } },
                                  },
                                },
                              },
                            },
                          },
                        },
                        platterDefinition: {
                          include: { components: { orderBy: { sortOrder: 'asc' } } },
                        },
                      },
                    },
                    modifierGroups: {
                      orderBy: { sortOrder: 'asc' },
                      include: {
                        modifierGroup: {
                          include: { options: { orderBy: { sortOrder: 'asc' } } },
                        },
                      },
                    },
                    modifierOptionOverrides: {
                      select: { modifierOptionId: true, priceDeltaCents: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!menu) return null;

    const mappedMenu = {
      id: menu.id,
      restaurantId: menu.restaurantId,
      name: menu.name,
      isActive: menu.isActive,
        sections: menu.sections.map((section) => ({
          id: section.id,
          name: section.name,
          nameI18n: asNameI18n(section.nameI18n),
          sortOrder: section.sortOrder,
          isVisible: section.isVisible,
          items: (section.items as unknown as RawMenuItem[]).map(mapMenuItem),
      })),
    };

    return applyDemoMenuTranslationFallback(mappedMenu);
  }
}

function mapMenuItem(item: RawMenuItem) {
  const rp = item.restaurantProduct;
  const product = rp.product;
  const productNameI18n = asNameI18n(product.nameI18n);
  const productDescriptionI18n = asNameI18n(product.descriptionI18n);
  return {
    id: item.id,
    restaurantProductId: rp.id,
    productId: product.id,
    name: item.displayNameOverride ?? rp.displayName ?? productNameI18n?.es ?? product.name,
    nameI18n: productNameI18n,
    description: product.description ?? productDescriptionI18n?.es ?? undefined,
    descriptionI18n: productDescriptionI18n,
    imageUrl: rp.imageUrl,
    productType: product.productType as 'simple' | 'combo' | 'platter',
    priceCents: item.priceOverrideCents ?? rp.priceCents,
    currency: rp.currency,
    isAvailable: rp.isAvailable && item.isVisible,
    // Se exponen aparte para que el admin pueda mostrar/editar "agotado" y "aparece en la app"
    // como dos controles independientes; `isAvailable` de arriba se deja combinada tal cual
    // porque la app movil sigue leyendo de este mismo endpoint y depende de que combine ambas.
    isVisible: item.isVisible,
    productAvailable: rp.isAvailable,
    defaultCourse: (product.defaultCourse ?? 'other') as 'drinks' | 'starter' | 'main' | 'dessert' | 'other',
    preparationRoute: (product.defaultPreparationRoute ?? 'direct') as 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station',
    allergens: (product.allergens ?? []) as RestaurantMenuItem['allergens'],
    taxRateName: product.taxRate?.name ?? null,
    taxRatePercent: product.taxRate ? Number(product.taxRate.ratePercent.toString()) : null,
    modifierGroups: rp.modifierGroups.map((rpMg) => mapModifierGroup(rpMg, buildOverrideMap(rp.modifierOptionOverrides ?? []))),
    comboDefinition: product.comboDefinition ? mapComboDefinition(product.comboDefinition) : null,
    platterComponents: product.platterDefinition
      ? product.platterDefinition.components.map(mapPlatterComponent)
      : [],
  };
}

function buildOverrideMap(overrides: RawModifierOptionOverride[]): Map<string, number> {
  return new Map(overrides.map((o) => [o.modifierOptionId, o.priceDeltaCents]));
}

function mapModifierGroup(rpMg: RawModifierGroup, overrideMap: Map<string, number>): RestaurantMenuModifierGroup {
  const mg = rpMg.modifierGroup;
  return {
    id: mg.id,
    name: mg.name,
    nameI18n: asNameI18n(mg.nameI18n),
    selectionType: (mg.selectionType === 'single' ? 'single' : 'multiple') as 'single' | 'multiple',
    minSelections: mg.minSelections,
    maxSelections: mg.maxSelections,
    isRequired: mg.isRequired,
    // El precio del modificador puede sobrescribirse por producto (Fase 2: overrides de precio
    // de modificador). Si existe override para este restaurantProduct, prevalece sobre el
    // priceDeltaCents por defecto del ModifierOption (compartido en todo el catálogo).
    options: mg.options.map((opt) => ({
      id: opt.id,
      name: opt.name,
      nameI18n: asNameI18n(opt.nameI18n),
      priceDeltaCents: overrideMap.get(opt.id) ?? opt.priceDeltaCents,
      isAvailable: opt.isAvailable,
    })),
  };
}

function mapComboDefinition(combo: RawComboDefinition): RestaurantMenuComboDefinition {
  return {
    id: combo.id,
    slots: combo.slots.map((slot) => ({
      id: slot.id,
      name: slot.name,
      nameI18n: asNameI18n(slot.nameI18n),
      minSelections: slot.minSelections,
      maxSelections: slot.maxSelections,
      isRequired: slot.isRequired,
      options: slot.options.map((opt) => ({
        id: opt.id,
        restaurantProductId: opt.restaurantProductId,
        name:
          opt.restaurantProduct.displayName ??
          asNameI18n(opt.restaurantProduct.product.nameI18n)?.es ??
          opt.restaurantProduct.product.name,
        supplementPriceCents: opt.supplementPriceCents,
        isAvailable: opt.isAvailable,
      })),
    })),
  };
}

function mapPlatterComponent(component: RawPlatterComponent): RestaurantMenuPlatterComponent {
  return {
    id: component.id,
    name: component.name,
    nameI18n: asNameI18n(component.nameI18n),
    removable: component.isRemovable,
    replaceable: component.isReplaceable,
    sortOrder: component.sortOrder,
  };
}
