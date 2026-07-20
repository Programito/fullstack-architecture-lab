import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { applicationError, menuSectionNameTaken, menuItemAlreadyInSection, productNameTaken, taxRateNotFound } from '../../../shared/errors/application-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { CreateProductData, RestaurantMenuAdminRepository, SortOrderItem, UpdateProductData } from '../../application/ports/restaurant-menu-admin-repository.port';
import type { Allergen, NameI18n, PreparationRoute, ProductCourse, RestaurantMenuItemView, RestaurantMenuSectionView, RestaurantProductDetail, RestaurantProductSummary } from '../../domain/restaurant-read.models';
import { asNameI18n, toNameI18nJson } from './name-i18n.mapper';

const TEMP_SORT_ORDER_OFFSET = 1_000_000;

const PRODUCT_SELECT_WITH_TAX = {
  organizationId: true,
  name: true,
  nameI18n: true,
  description: true,
  descriptionI18n: true,
  productType: true,
  defaultCourse: true,
  defaultPreparationRoute: true,
  allergens: true,
  taxRateId: true,
  taxRate: { select: { name: true, ratePercent: true } },
} as const;

@Injectable()
export class PrismaRestaurantMenuAdminRepository implements RestaurantMenuAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMenuById(restaurantId: string, menuId: string): Promise<{ id: string } | null> {
    return this.prisma.restaurantMenu.findFirst({
      where: { id: menuId, restaurantId },
      select: { id: true },
    });
  }

  async findSectionById(restaurantId: string, menuId: string, sectionId: string): Promise<RestaurantMenuSectionView | null> {
    const section = await this.prisma.menuSection.findFirst({
      where: { id: sectionId, menuId, menu: { restaurantId } },
    });
    return section ? mapSection(section) : null;
  }

  async createSection(restaurantId: string, menuId: string, data: { name: string; nameI18n?: NameI18n; isVisible: boolean }): Promise<RestaurantMenuSectionView> {
    // Mismo problema que en `addSectionItem`: `sortOrder` tiene su propia restriccion unica por
    // menu (@@unique([menuId, sortOrder])) y calcularlo con `count()` choca en cuanto hay huecos
    // (una seccion borrada de en medio), lo que antes se etiquetaba como "nombre ya usado" aunque
    // el nombre no tuviera nada que ver.
    const maxSortOrder = await this.prisma.menuSection.aggregate({
      where: { menuId },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;
    try {
      const section = await this.prisma.menuSection.create({
        data: {
          menuId,
          name: data.name,
          nameI18n: toNameI18nJson(data.nameI18n),
          sortOrder: nextSortOrder,
          isVisible: data.isVisible,
        },
      });
      return mapSection(section);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target) ? (error.meta!.target as string[]) : [];
        if (target.includes('name')) {
          throw new ApplicationErrorException(menuSectionNameTaken(data.name));
        }
      }
      throw error;
    }
  }

  async updateSection(restaurantId: string, menuId: string, sectionId: string, data: { name?: string; nameI18n?: NameI18n; isVisible?: boolean }): Promise<RestaurantMenuSectionView | null> {
    const existing = await this.prisma.menuSection.findFirst({
      where: { id: sectionId, menuId, menu: { restaurantId } },
      select: { id: true },
    });
    if (!existing) return null;

    try {
      const section = await this.prisma.menuSection.update({
        where: { id: sectionId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.nameI18n !== undefined && { nameI18n: toNameI18nJson(data.nameI18n) }),
          ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
        },
      });
      return mapSection(section);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApplicationErrorException(menuSectionNameTaken(data.name ?? ''));
      }
      throw error;
    }
  }

  async deleteSection(restaurantId: string, menuId: string, sectionId: string): Promise<boolean> {
    const existing = await this.prisma.menuSection.findFirst({
      where: { id: sectionId, menuId, menu: { restaurantId } },
      select: { id: true },
    });
    if (!existing) return false;

    await this.prisma.menuSection.delete({ where: { id: sectionId } });
    return true;
  }

  async findItemById(restaurantId: string, menuId: string, sectionId: string, itemId: string): Promise<RestaurantMenuItemView | null> {
    const item = await this.prisma.menuItem.findFirst({
      where: { id: itemId, menuSectionId: sectionId, menuSection: { menuId, menu: { restaurantId } } },
    });
    return item ? mapItem(item) : null;
  }

  async addSectionItem(restaurantId: string, menuId: string, sectionId: string, data: { restaurantProductId: string; displayNameOverride?: string; priceOverrideCents?: number }): Promise<RestaurantMenuItemView> {
    const sectionExists = await this.prisma.menuSection.findFirst({
      where: { id: sectionId, menuId, menu: { restaurantId } },
      select: { id: true },
    });
    if (!sectionExists) {
      const { menuSectionNotFound } = await import('../../../shared/errors/application-error');
      throw new ApplicationErrorException(menuSectionNotFound(sectionId));
    }

    // OJO: `sortOrder` tiene su propia restriccion unica por seccion (@@unique([menuSectionId,
    // sortOrder])), aparte de la de (menuSectionId, restaurantProductId). Calcularlo a partir de
    // un `count()` de filas rompe en cuanto hay huecos en la secuencia (p.ej. tras borrar un item
    // intermedio): el `count` ya no coincide con el `sortOrder` maximo real y choca con un item
    // existente -> P2002 -> antes esto se etiquetaba SIEMPRE como "ya esta en esa seccion" aunque
    // el producto nunca hubiera estado ahi, y el alta fallaba en silencio una y otra vez. Se usa
    // el maximo `sortOrder` existente + 1 para evitar el hueco.
    const maxSortOrder = await this.prisma.menuItem.aggregate({
      where: { menuSectionId: sectionId },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;
    try {
      const item = await this.prisma.menuItem.create({
        data: {
          menuSectionId: sectionId,
          restaurantProductId: data.restaurantProductId,
          displayNameOverride: data.displayNameOverride ?? null,
          priceOverrideCents: data.priceOverrideCents ?? null,
          sortOrder: nextSortOrder,
          isVisible: true,
        },
      });
      return mapItem(item);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // Distinguimos por el campo que realmente choco: si fue `restaurantProductId`, el
        // producto de verdad ya estaba en esa seccion; si fue `sortOrder` (aun puede pasar en una
        // carrera muy puntual entre dos altas simultaneas), no es un duplicado real.
        const target = Array.isArray(error.meta?.target) ? (error.meta!.target as string[]) : [];
        if (target.includes('restaurantProductId')) {
          throw new ApplicationErrorException(menuItemAlreadyInSection(data.restaurantProductId));
        }
      }
      throw error;
    }
  }

  async updateSectionItem(restaurantId: string, menuId: string, sectionId: string, itemId: string, data: { displayNameOverride?: string | null; priceOverrideCents?: number | null; isVisible?: boolean }): Promise<RestaurantMenuItemView | null> {
    const existing = await this.prisma.menuItem.findFirst({
      where: { id: itemId, menuSectionId: sectionId, menuSection: { menuId, menu: { restaurantId } } },
      select: { id: true },
    });
    if (!existing) return null;

    const item = await this.prisma.menuItem.update({
      where: { id: itemId },
      data,
    });
    return mapItem(item);
  }

  async removeSectionItem(restaurantId: string, menuId: string, sectionId: string, itemId: string): Promise<boolean> {
    const existing = await this.prisma.menuItem.findFirst({
      where: { id: itemId, menuSectionId: sectionId, menuSection: { menuId, menu: { restaurantId } } },
      select: { id: true },
    });
    if (!existing) return false;

    await this.prisma.menuItem.delete({ where: { id: itemId } });
    return true;
  }

  async reorderSections(restaurantId: string, menuId: string, items: SortOrderItem[]): Promise<boolean> {
    const menu = await this.prisma.restaurantMenu.findFirst({
      where: { id: menuId, restaurantId },
      select: { id: true },
    });
    if (!menu) return false;

    if (items.length > 0) {
      await this.prisma.$transaction(
        items.map(({ id, sortOrder }) =>
          this.prisma.menuSection.updateMany({
            where: { id, menuId },
            data: { sortOrder: sortOrder + TEMP_SORT_ORDER_OFFSET },
          }),
        ),
      );
      await this.prisma.$transaction(
        items.map(({ id, sortOrder }) =>
          this.prisma.menuSection.updateMany({
            where: { id, menuId },
            data: { sortOrder },
          }),
        ),
      );
    }
    return true;
  }

  async reorderSectionItems(restaurantId: string, menuId: string, sectionId: string, items: SortOrderItem[]): Promise<boolean> {
    const section = await this.prisma.menuSection.findFirst({
      where: { id: sectionId, menuId, menu: { restaurantId } },
      select: { id: true },
    });
    if (!section) return false;

    if (items.length > 0) {
      await this.prisma.$transaction(
        items.map(({ id, sortOrder }) =>
          this.prisma.menuItem.updateMany({
            where: { id, menuSectionId: sectionId },
            data: { sortOrder: sortOrder + TEMP_SORT_ORDER_OFFSET },
          }),
        ),
      );
      await this.prisma.$transaction(
        items.map(({ id, sortOrder }) =>
          this.prisma.menuItem.updateMany({
            where: { id, menuSectionId: sectionId },
            data: { sortOrder },
          }),
        ),
      );
    }
    return true;
  }

  async listRestaurantProducts(restaurantId: string): Promise<RestaurantProductSummary[]> {
    const rows = await this.prisma.restaurantProduct.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        product: { select: { name: true, nameI18n: true, productType: true, defaultCourse: true, defaultPreparationRoute: true, allergens: true } },
        modifierGroups: { select: { modifierGroupId: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    return rows.map((rp) => ({
      id: rp.id,
      productId: rp.productId,
      name: rp.displayName ?? rp.product.name,
      nameI18n: asNameI18n(rp.product.nameI18n),
      displayName: rp.displayName,
      imageUrl: rp.imageUrl,
      modifierGroupIds: rp.modifierGroups.map(({ modifierGroupId }) => modifierGroupId),
      productType: rp.product.productType as 'simple' | 'combo' | 'platter',
      course: rp.product.defaultCourse as RestaurantProductSummary['course'],
      preparationRoute: rp.product.defaultPreparationRoute as RestaurantProductSummary['preparationRoute'],
      allergens: (rp.product.allergens ?? []) as Allergen[],
      priceCents: rp.priceCents,
      currency: rp.currency,
      isAvailable: rp.isAvailable,
      isVisible: rp.isVisible,
    }));
  }

  async findRestaurantProductById(restaurantId: string, productId: string): Promise<RestaurantProductDetail | null> {
    const rp = await this.prisma.restaurantProduct.findFirst({
      where: { id: productId, restaurantId },
      include: {
        product: { select: PRODUCT_SELECT_WITH_TAX },
        modifierGroups: { select: { modifierGroupId: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    return rp ? mapProductDetail(rp) : null;
  }

  async createProduct(restaurantId: string, data: CreateProductData): Promise<RestaurantProductDetail> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { organizationId: true },
    });
    if (!restaurant) {
      throw new Error(`Restaurant "${restaurantId}" not found.`);
    }

    const count = await this.prisma.restaurantProduct.count({ where: { restaurantId } });

    try {
      const rp = await this.prisma.$transaction(async (tx) => {
        const modifierGroups = await this.resolveModifierGroups(tx, restaurant.organizationId, data.modifierGroupIds);
        const taxRateId = await this.resolveTaxRateId(tx, restaurant.organizationId, data.taxRateId);
        const product = await tx.product.create({
          data: {
            organizationId: restaurant.organizationId,
            name: data.name,
            nameI18n: toNameI18nJson(data.nameI18n),
            description: data.description ?? null,
            descriptionI18n: toNameI18nJson(data.descriptionI18n),
            productType: 'simple',
            defaultCourse: data.course,
            defaultPreparationRoute: data.preparationRoute,
            allergens: data.allergens ?? [],
            taxRateId,
          },
        });

        return tx.restaurantProduct.create({
          data: {
            restaurantId,
            productId: product.id,
            priceCents: data.priceCents,
            currency: data.currency,
            isAvailable: true,
            isVisible: true,
            imageUrl: data.imageUrl ?? null,
            sortOrder: count,
            modifierGroups: modifierGroups.length > 0
              ? {
                  create: modifierGroups.map((modifierGroupId, index) => ({
                    modifierGroupId,
                    sortOrder: index,
                  })),
                }
              : undefined,
          },
          include: {
            product: { select: PRODUCT_SELECT_WITH_TAX },
            modifierGroups: { select: { modifierGroupId: true }, orderBy: { sortOrder: 'asc' } },
          },
        });
      });

      return mapProductDetail(rp);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApplicationErrorException(productNameTaken(data.name));
      }
      throw error;
    }
  }

  async updateProduct(restaurantId: string, productId: string, data: UpdateProductData): Promise<RestaurantProductDetail | null> {
    const existing = await this.prisma.restaurantProduct.findFirst({
      where: { id: productId, restaurantId },
      select: { id: true, productId: true },
    });
    if (!existing) return null;

    try {
      const rp = await this.prisma.$transaction(async (tx) => {
        const currentProduct = await tx.product.findUnique({
          where: { id: existing.productId },
          select: { organizationId: true },
        });
        if (!currentProduct) {
          throw new ApplicationErrorException(applicationError('restaurant_product_not_found', `Restaurant product "${productId}" was not found.`, { productId }));
        }

        const taxRateId = data.taxRateId !== undefined
          ? await this.resolveTaxRateId(tx, currentProduct.organizationId, data.taxRateId)
          : undefined;

        if (data.name !== undefined || data.nameI18n !== undefined || data.description !== undefined || data.descriptionI18n !== undefined || data.course !== undefined || data.preparationRoute !== undefined || data.allergens !== undefined || taxRateId !== undefined) {
          await tx.product.update({
            where: { id: existing.productId },
            data: {
              ...(data.name !== undefined && { name: data.name }),
              ...(data.nameI18n !== undefined && { nameI18n: toNameI18nJson(data.nameI18n) }),
              ...(data.description !== undefined && { description: data.description }),
              ...(data.descriptionI18n !== undefined && { descriptionI18n: toNameI18nJson(data.descriptionI18n) }),
              ...(data.course !== undefined && { defaultCourse: data.course }),
              ...(data.preparationRoute !== undefined && { defaultPreparationRoute: data.preparationRoute }),
              ...(data.allergens !== undefined && { allergens: data.allergens }),
              ...(taxRateId !== undefined && { taxRateId }),
            },
          });
        }

        if (data.modifierGroupIds !== undefined) {
          const modifierGroups = await this.resolveModifierGroups(tx, currentProduct.organizationId, data.modifierGroupIds);
          await tx.restaurantProductModifierGroup.deleteMany({ where: { restaurantProductId: productId } });
          if (modifierGroups.length > 0) {
            await tx.restaurantProductModifierGroup.createMany({
              data: modifierGroups.map((modifierGroupId, index) => ({
                restaurantProductId: productId,
                modifierGroupId,
                sortOrder: index,
              })),
            });
          }
        }

        return tx.restaurantProduct.update({
          where: { id: productId },
          data: {
            ...(data.priceCents !== undefined && { priceCents: data.priceCents }),
            ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
            ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
            ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
          },
          include: {
            product: { select: PRODUCT_SELECT_WITH_TAX },
            modifierGroups: { select: { modifierGroupId: true }, orderBy: { sortOrder: 'asc' } },
          },
        });
      });

      return mapProductDetail(rp);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApplicationErrorException(productNameTaken(data.name ?? ''));
      }
      throw error;
    }
  }

  async deleteProduct(restaurantId: string, productId: string): Promise<boolean> {
    const existing = await this.prisma.restaurantProduct.findFirst({
      where: { id: productId, restaurantId },
      select: { id: true, productId: true },
    });
    if (!existing) return false;

    await this.prisma.$transaction(async (tx) => {
      await tx.restaurantProduct.delete({ where: { id: productId } });

      const siblingCount = await tx.restaurantProduct.count({ where: { productId: existing.productId } });
      if (siblingCount === 0) {
        await tx.product.delete({ where: { id: existing.productId } });
      }
    });

  return true;
  }

  private async resolveModifierGroups(
    tx: Prisma.TransactionClient,
    organizationId: string,
    requestedModifierGroupIds: string[] | undefined,
  ): Promise<string[]> {
    const uniqueModifierGroupIds = [...new Set(requestedModifierGroupIds ?? [])];
    if (uniqueModifierGroupIds.length === 0) {
      return [];
    }

    const validModifierGroups = await tx.modifierGroup.findMany({
      where: {
        organizationId,
        id: { in: uniqueModifierGroupIds },
      },
      select: { id: true },
    });

    if (validModifierGroups.length !== uniqueModifierGroupIds.length) {
      throw new ApplicationErrorException(
        applicationError('invalid_order_configuration', 'Some modifier groups are not available for this product.', {
          modifierGroupIds: uniqueModifierGroupIds,
        }),
      );
    }

    return uniqueModifierGroupIds;
  }

  // Devuelve el `taxRateId` validado (o `null` si se pide desasignar el IVA). Se valida que la
  // tasa exista y pertenezca a la misma organizacion que el producto, igual que
  // `resolveModifierGroups` hace con los grupos de modificadores: evita que un producto de una
  // organizacion quede enlazado a un tipo de IVA de otra.
  private async resolveTaxRateId(
    tx: Prisma.TransactionClient,
    organizationId: string,
    requestedTaxRateId: string | null | undefined,
  ): Promise<string | null> {
    if (!requestedTaxRateId) {
      return null;
    }

    const taxRate = await tx.taxRate.findFirst({
      where: { id: requestedTaxRateId, organizationId },
      select: { id: true },
    });
    if (!taxRate) {
      throw new ApplicationErrorException(taxRateNotFound(requestedTaxRateId));
    }

    return taxRate.id;
  }
}

function mapSection(section: { id: string; menuId: string; name: string; nameI18n?: unknown; sortOrder: number; isVisible: boolean }): RestaurantMenuSectionView {
  return {
    id: section.id,
    menuId: section.menuId,
    name: section.name,
    nameI18n: asNameI18n(section.nameI18n),
    sortOrder: section.sortOrder,
    isVisible: section.isVisible,
  };
}

function mapItem(item: { id: string; menuSectionId: string; restaurantProductId: string; displayNameOverride: string | null; priceOverrideCents: number | null; sortOrder: number; isVisible: boolean }): RestaurantMenuItemView {
  return {
    id: item.id,
    sectionId: item.menuSectionId,
    restaurantProductId: item.restaurantProductId,
    displayNameOverride: item.displayNameOverride,
    priceOverrideCents: item.priceOverrideCents,
    sortOrder: item.sortOrder,
    isVisible: item.isVisible,
  };
}

type RpWithProduct = {
  id: string;
  productId: string;
  displayName: string | null;
  displayDescription: string | null;
  priceCents: number;
  currency: string;
  isAvailable: boolean;
  isVisible: boolean;
  imageUrl: string | null;
  modifierGroups: Array<{ modifierGroupId: string }>;
  preparationRouteOverride: string | null;
  product: {
    organizationId: string;
    name: string;
    nameI18n?: unknown;
    description: string | null;
    descriptionI18n?: unknown;
    productType: string;
    defaultCourse: string;
    defaultPreparationRoute: string;
    allergens?: string[];
    taxRateId?: string | null;
    taxRate?: { name: string; ratePercent: Prisma.Decimal } | null;
  };
};

function mapProductDetail(rp: RpWithProduct): RestaurantProductDetail {
  return {
    id: rp.id,
    productId: rp.productId,
    organizationId: rp.product.organizationId,
    name: rp.product.name,
    nameI18n: asNameI18n(rp.product.nameI18n),
    displayName: rp.displayName,
    description: rp.product.description,
    descriptionI18n: asNameI18n(rp.product.descriptionI18n),
    displayDescription: rp.displayDescription,
    imageUrl: rp.imageUrl,
    modifierGroupIds: rp.modifierGroups.map(({ modifierGroupId }) => modifierGroupId),
    productType: rp.product.productType as 'simple' | 'combo' | 'platter',
    course: rp.product.defaultCourse as ProductCourse,
    preparationRoute: rp.product.defaultPreparationRoute as PreparationRoute,
    preparationRouteOverride: rp.preparationRouteOverride as PreparationRoute | null,
    allergens: (rp.product.allergens ?? []) as Allergen[],
    priceCents: rp.priceCents,
    currency: rp.currency,
    isAvailable: rp.isAvailable,
    isVisible: rp.isVisible,
    taxRateId: rp.product.taxRateId ?? null,
    taxRateName: rp.product.taxRate?.name ?? null,
    taxRatePercent: rp.product.taxRate ? Number(rp.product.taxRate.ratePercent.toString()) : null,
  };
}
