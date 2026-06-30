import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { RestaurantOrderCatalogRepository } from '../../application/ports/restaurant-order-catalog-repository.port';
import type {
  RestaurantMenu,
  RestaurantMenuComboDefinition,
  RestaurantMenuModifierGroup,
  RestaurantMenuPlatterComponent,
} from '../../domain/restaurant-read.models';

type RawModifierOption = { id: string; name: string; priceDeltaCents: number; isAvailable: boolean };
type RawModifierGroup = {
  modifierGroup: {
    id: string;
    name: string;
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
  restaurantProduct: { displayName: string | null; product: { name: string } };
};
type RawComboSlot = {
  id: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: RawComboSlotOption[];
};
type RawComboDefinition = { id: string; slots: RawComboSlot[] };
type RawPlatterComponent = { id: string; name: string; isRemovable: boolean; isReplaceable: boolean; sortOrder: number };
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
      description: string | null;
      productType: string;
      defaultCourse: string | null;
      defaultPreparationRoute: string | null;
      comboDefinition: RawComboDefinition | null;
      platterDefinition: { components: RawPlatterComponent[] } | null;
    };
    modifierGroups: RawModifierGroup[];
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
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!menu) return null;

    return {
      id: menu.id,
      restaurantId: menu.restaurantId,
      name: menu.name,
      isActive: menu.isActive,
      sections: menu.sections.map((section) => ({
        id: section.id,
        name: section.name,
        sortOrder: section.sortOrder,
        isVisible: section.isVisible,
        items: (section.items as unknown as RawMenuItem[]).map(mapMenuItem),
      })),
    };
  }
}

function mapMenuItem(item: RawMenuItem) {
  const rp = item.restaurantProduct;
  const product = rp.product;
  return {
    id: item.id,
    restaurantProductId: rp.id,
    productId: product.id,
    name: item.displayNameOverride ?? rp.displayName ?? product.name,
    description: product.description ?? undefined,
    imageUrl: rp.imageUrl,
    productType: product.productType as 'simple' | 'combo' | 'platter',
    priceCents: item.priceOverrideCents ?? rp.priceCents,
    currency: rp.currency,
    isAvailable: rp.isAvailable && item.isVisible,
    defaultCourse: (product.defaultCourse ?? 'other') as 'drinks' | 'starter' | 'main' | 'dessert' | 'other',
    preparationRoute: (product.defaultPreparationRoute ?? 'direct') as 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station',
    modifierGroups: rp.modifierGroups.map(mapModifierGroup),
    comboDefinition: product.comboDefinition ? mapComboDefinition(product.comboDefinition) : null,
    platterComponents: product.platterDefinition
      ? product.platterDefinition.components.map(mapPlatterComponent)
      : [],
  };
}

function mapModifierGroup(rpMg: RawModifierGroup): RestaurantMenuModifierGroup {
  const mg = rpMg.modifierGroup;
  return {
    id: mg.id,
    name: mg.name,
    selectionType: (mg.selectionType === 'single' ? 'single' : 'multiple') as 'single' | 'multiple',
    minSelections: mg.minSelections,
    maxSelections: mg.maxSelections,
    isRequired: mg.isRequired,
    options: mg.options.map((opt) => ({
      id: opt.id,
      name: opt.name,
      priceDeltaCents: opt.priceDeltaCents,
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
      minSelections: slot.minSelections,
      maxSelections: slot.maxSelections,
      isRequired: slot.isRequired,
      options: slot.options.map((opt) => ({
        id: opt.id,
        restaurantProductId: opt.restaurantProductId,
        name: opt.restaurantProduct.displayName ?? opt.restaurantProduct.product.name,
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
    removable: component.isRemovable,
    replaceable: component.isReplaceable,
    sortOrder: component.sortOrder,
  };
}
