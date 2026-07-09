import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { applicationError, menuSectionNameTaken, menuItemAlreadyInSection, productNameTaken } from '../../../shared/errors/application-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { CreateProductData, RestaurantMenuAdminRepository, SortOrderItem, UpdateProductData } from '../../application/ports/restaurant-menu-admin-repository.port';
import type { Allergen, PreparationRoute, ProductCourse, RestaurantMenuItemView, RestaurantMenuSectionView, RestaurantProductDetail, RestaurantProductSummary } from '../../domain/restaurant-read.models';

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

  async createSection(restaurantId: string, menuId: string, data: { name: string; isVisible: boolean }): Promise<RestaurantMenuSectionView> {
    const count = await this.prisma.menuSection.count({ where: { menuId } });
    try {
      const section = await this.prisma.menuSection.create({
        data: {
          menuId,
          name: data.name,
          sortOrder: count,
          isVisible: data.isVisible,
        },
      });
      return mapSection(section);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApplicationErrorException(menuSectionNameTaken(data.name));
      }
      throw error;
    }
  }

  async updateSection(restaurantId: string, menuId: string, sectionId: string, data: { name?: string; isVisible?: boolean }): Promise<RestaurantMenuSectionView | null> {
    const existing = await this.prisma.menuSection.findFirst({
      where: { id: sectionId, menuId, menu: { restaurantId } },
      select: { id: true },
    });
    if (!existing) return null;

    try {
      const section = await this.prisma.menuSection.update({
        where: { id: sectionId },
        data,
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

    const count = await this.prisma.menuItem.count({ where: { menuSectionId: sectionId } });
    try {
      const item = await this.prisma.menuItem.create({
        data: {
          menuSectionId: sectionId,
          restaurantProductId: data.restaurantProductId,
          displayNameOverride: data.displayNameOverride ?? null,
          priceOverrideCents: data.priceOverrideCents ?? null,
          sortOrder: count,
          isVisible: true,
        },
      });
      return mapItem(item);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApplicationErrorException(menuItemAlreadyInSection(data.restaurantProductId));
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

    await this.prisma.$transaction(
      items.map(({ id, sortOrder }) =>
        this.prisma.menuSection.updateMany({
          where: { id, menuId },
          data: { sortOrder },
        }),
      ),
    );
    return true;
  }

  async reorderSectionItems(restaurantId: string, menuId: string, sectionId: string, items: SortOrderItem[]): Promise<boolean> {
    const section = await this.prisma.menuSection.findFirst({
      where: { id: sectionId, menuId, menu: { restaurantId } },
      select: { id: true },
    });
    if (!section) return false;

    await this.prisma.$transaction(
      items.map(({ id, sortOrder }) =>
        this.prisma.menuItem.updateMany({
          where: { id, menuSectionId: sectionId },
          data: { sortOrder },
        }),
      ),
    );
    return true;
  }

  async listRestaurantProducts(restaurantId: string): Promise<RestaurantProductSummary[]> {
    const rows = await this.prisma.restaurantProduct.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        product: { select: { name: true, productType: true, defaultCourse: true, defaultPreparationRoute: true, allergens: true } },
        modifierGroups: { select: { modifierGroupId: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    return rows.map((rp) => ({
      id: rp.id,
      productId: rp.productId,
      name: rp.displayName ?? rp.product.name,
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
        product: { select: { organizationId: true, name: true, description: true, productType: true, defaultCourse: true, defaultPreparationRoute: true, allergens: true } },
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
        const product = await tx.product.create({
          data: {
            organizationId: restaurant.organizationId,
            name: data.name,
            description: data.description ?? null,
            productType: 'simple',
            defaultCourse: data.course,
            defaultPreparationRoute: data.preparationRoute,
            allergens: data.allergens ?? [],
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
            product: { select: { organizationId: true, name: true, description: true, productType: true, defaultCourse: true, defaultPreparationRoute: true, allergens: true } },
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

        if (data.name !== undefined || data.description !== undefined || data.course !== undefined || data.preparationRoute !== undefined || data.allergens !== undefined) {
          await tx.product.update({
            where: { id: existing.productId },
            data: {
              ...(data.name !== undefined && { name: data.name }),
              ...(data.description !== undefined && { description: data.description }),
              ...(data.course !== undefined && { defaultCourse: data.course }),
              ...(data.preparationRoute !== undefined && { defaultPreparationRoute: data.preparationRoute }),
              ...(data.allergens !== undefined && { allergens: data.allergens }),
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
            product: { select: { organizationId: true, name: true, description: true, productType: true, defaultCourse: true, defaultPreparationRoute: true, allergens: true } },
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
}

function mapSection(section: { id: string; menuId: string; name: string; sortOrder: number; isVisible: boolean }): RestaurantMenuSectionView {
  return {
    id: section.id,
    menuId: section.menuId,
    name: section.name,
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
    description: string | null;
    productType: string;
    defaultCourse: string;
    defaultPreparationRoute: string;
    allergens?: string[];
  };
};

function mapProductDetail(rp: RpWithProduct): RestaurantProductDetail {
  return {
    id: rp.id,
    productId: rp.productId,
    organizationId: rp.product.organizationId,
    name: rp.product.name,
    displayName: rp.displayName,
    description: rp.product.description,
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
  };
}
