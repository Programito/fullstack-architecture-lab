import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { menuSectionNameTaken, menuItemAlreadyInSection } from '../../../shared/errors/application-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { RestaurantMenuAdminRepository, SortOrderItem } from '../../application/ports/restaurant-menu-admin-repository.port';
import type { RestaurantMenuItemView, RestaurantMenuSectionView, RestaurantProductSummary } from '../../domain/restaurant-read.models';

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
      include: { product: { select: { name: true, productType: true } } },
    });

    return rows.map((rp) => ({
      id: rp.id,
      productId: rp.productId,
      name: rp.displayName ?? rp.product.name,
      displayName: rp.displayName,
      productType: rp.product.productType as 'simple' | 'combo' | 'platter',
      priceCents: rp.priceCents,
      currency: rp.currency,
      isAvailable: rp.isAvailable,
      isVisible: rp.isVisible,
    }));
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
