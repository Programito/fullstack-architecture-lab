import { Injectable } from '@nestjs/common';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { modifierOptionNotFound } from '../../../shared/errors/application-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type {
  ModifierOptionForProductEntity,
  ModifierOptionOverrideRepository,
  SetModifierOptionPriceOverrideData,
} from '../../application/ports/modifier-option-override-repository.port';

@Injectable()
export class PrismaModifierOptionOverrideRepository implements ModifierOptionOverrideRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrganizationIdByRestaurantId(restaurantId: string): Promise<string | null> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { organizationId: true },
    });
    return restaurant?.organizationId ?? null;
  }

  async findRestaurantProductId(restaurantId: string, restaurantProductId: string): Promise<string | null> {
    const rp = await this.prisma.restaurantProduct.findFirst({
      where: { id: restaurantProductId, restaurantId },
      select: { id: true },
    });
    return rp?.id ?? null;
  }

  async findModifierOptionOrganizationId(modifierOptionId: string): Promise<string | null> {
    const option = await this.prisma.modifierOption.findUnique({
      where: { id: modifierOptionId },
      select: { modifierGroup: { select: { organizationId: true } } },
    });
    return option?.modifierGroup.organizationId ?? null;
  }

  async listForRestaurantProduct(restaurantProductId: string): Promise<ModifierOptionForProductEntity[]> {
    const rp = await this.prisma.restaurantProduct.findUnique({
      where: { id: restaurantProductId },
      include: {
        modifierGroups: {
          include: { modifierGroup: { include: { options: { orderBy: { sortOrder: 'asc' } } } } },
        },
        modifierOptionOverrides: true,
      },
    });
    if (!rp) return [];

    const overrideMap = new Map(rp.modifierOptionOverrides.map((o) => [o.modifierOptionId, o.priceDeltaCents]));
    const result: ModifierOptionForProductEntity[] = [];
    for (const rpGroup of rp.modifierGroups) {
      for (const option of rpGroup.modifierGroup.options) {
        result.push({
          modifierOptionId: option.id,
          modifierOptionName: option.name,
          modifierGroupId: rpGroup.modifierGroup.id,
          modifierGroupName: rpGroup.modifierGroup.name,
          defaultPriceDeltaCents: option.priceDeltaCents,
          overridePriceDeltaCents: overrideMap.get(option.id) ?? null,
        });
      }
    }
    return result;
  }

  async setOverride(data: SetModifierOptionPriceOverrideData): Promise<ModifierOptionForProductEntity> {
    const option = await this.prisma.modifierOption.findUnique({
      where: { id: data.modifierOptionId },
      include: { modifierGroup: true },
    });
    if (!option) {
      throw new ApplicationErrorException(modifierOptionNotFound(data.modifierOptionId));
    }

    await this.prisma.restaurantProductModifierOptionOverride.upsert({
      where: {
        restaurantProductId_modifierOptionId: {
          restaurantProductId: data.restaurantProductId,
          modifierOptionId: data.modifierOptionId,
        },
      },
      create: {
        restaurantProductId: data.restaurantProductId,
        modifierOptionId: data.modifierOptionId,
        priceDeltaCents: data.priceDeltaCents,
      },
      update: { priceDeltaCents: data.priceDeltaCents },
    });

    return {
      modifierOptionId: option.id,
      modifierOptionName: option.name,
      modifierGroupId: option.modifierGroupId,
      modifierGroupName: option.modifierGroup.name,
      defaultPriceDeltaCents: option.priceDeltaCents,
      overridePriceDeltaCents: data.priceDeltaCents,
    };
  }

  async clearOverride(restaurantProductId: string, modifierOptionId: string): Promise<void> {
    await this.prisma.restaurantProductModifierOptionOverride.deleteMany({
      where: { restaurantProductId, modifierOptionId },
    });
  }
}
