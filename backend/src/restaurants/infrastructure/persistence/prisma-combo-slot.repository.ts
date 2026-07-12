import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { invalidComboSlotConfiguration } from '../../../shared/errors/application-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type {
  ComboSlotEntity,
  ComboSlotOptionEntity,
  ComboSlotRepository,
  CreateComboSlotData,
  ResolveComboProductContextResult,
  UpdateComboSlotData,
} from '../../application/ports/combo-slot-repository.port';
import { asNameI18n, toNameI18nJson } from './name-i18n.mapper';

const SLOT_WITH_OPTIONS_INCLUDE = {
  options: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      restaurantProduct: {
        select: { displayName: true, product: { select: { name: true } } },
      },
    },
  },
};

type SlotWithOptions = Prisma.ComboSlotGetPayload<{ include: typeof SLOT_WITH_OPTIONS_INCLUDE }>;

@Injectable()
export class PrismaComboSlotRepository implements ComboSlotRepository {
  constructor(private readonly prisma: PrismaService) {}

  async resolveComboProductContext(restaurantId: string, restaurantProductId: string): Promise<ResolveComboProductContextResult> {
    const rp = await this.prisma.restaurantProduct.findFirst({
      where: { id: restaurantProductId, restaurantId },
      select: { id: true, productId: true, product: { select: { productType: true } } },
    });
    if (!rp) return { status: 'not_found' };
    if (rp.product.productType !== 'combo') return { status: 'not_combo' };

    // There is no dedicated endpoint to create a ComboDefinition (a combo
    // product always needs exactly one, 1:1 by productId) — provision it
    // lazily on first use of the combo-slots endpoints, same aditivo spirit
    // as the rest of this feature.
    const comboDefinition = await this.prisma.comboDefinition.upsert({
      where: { productId: rp.productId },
      update: {},
      create: { productId: rp.productId, pricingMode: 'base_plus_supplements' },
      select: { id: true },
    });

    return {
      status: 'ok',
      context: { restaurantProductId: rp.id, productId: rp.productId, comboDefinitionId: comboDefinition.id },
    };
  }

  async findById(comboDefinitionId: string, slotId: string): Promise<ComboSlotEntity | null> {
    const slot = await this.prisma.comboSlot.findFirst({
      where: { id: slotId, comboDefinitionId },
      include: SLOT_WITH_OPTIONS_INCLUDE,
    });
    return slot ? this.toEntity(slot) : null;
  }

  async areRestaurantProductsValid(restaurantId: string, restaurantProductIds: string[]): Promise<boolean> {
    const uniqueIds = [...new Set(restaurantProductIds)];
    if (uniqueIds.length === 0) return true;
    const count = await this.prisma.restaurantProduct.count({
      where: { id: { in: uniqueIds }, restaurantId },
    });
    return count === uniqueIds.length;
  }

  async create(comboDefinitionId: string, data: CreateComboSlotData): Promise<ComboSlotEntity> {
    const count = await this.prisma.comboSlot.count({ where: { comboDefinitionId } });
    try {
      const slot = await this.prisma.comboSlot.create({
        data: {
          comboDefinitionId,
          name: data.name,
          nameI18n: toNameI18nJson(data.nameI18n),
          minSelections: data.minSelections,
          maxSelections: data.maxSelections,
          isRequired: data.isRequired,
          sortOrder: count,
          options: {
            createMany: {
              data: data.options.map((opt, i) => ({
                restaurantProductId: opt.restaurantProductId,
                supplementPriceCents: opt.supplementPriceCents,
                isDefault: opt.isDefault ?? false,
                isAvailable: true,
                sortOrder: i + 1,
              })),
            },
          },
        },
        include: SLOT_WITH_OPTIONS_INCLUDE,
      });
      return this.toEntity(slot);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApplicationErrorException(
          invalidComboSlotConfiguration(`ya existe un hueco llamado "${data.name}" en este combo.`, { name: data.name }),
        );
      }
      throw error;
    }
  }

  async update(comboDefinitionId: string, slotId: string, data: UpdateComboSlotData): Promise<ComboSlotEntity | null> {
    const existing = await this.prisma.comboSlot.findFirst({ where: { id: slotId, comboDefinitionId }, select: { id: true } });
    if (!existing) return null;

    try {
      const slot = await this.prisma.$transaction(async (tx) => {
        if (data.options !== undefined) {
          await tx.comboSlotOption.deleteMany({ where: { comboSlotId: slotId } });
        }
        return tx.comboSlot.update({
          where: { id: slotId },
          data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.nameI18n !== undefined && { nameI18n: toNameI18nJson(data.nameI18n) }),
            ...(data.minSelections !== undefined && { minSelections: data.minSelections }),
            ...(data.maxSelections !== undefined && { maxSelections: data.maxSelections }),
            ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
            ...(data.options !== undefined && {
              options: {
                createMany: {
                  data: data.options.map((opt, i) => ({
                    restaurantProductId: opt.restaurantProductId,
                    supplementPriceCents: opt.supplementPriceCents,
                    isDefault: opt.isDefault ?? false,
                    isAvailable: true,
                    sortOrder: i + 1,
                  })),
                },
              },
            }),
          },
          include: SLOT_WITH_OPTIONS_INCLUDE,
        });
      });
      return this.toEntity(slot);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApplicationErrorException(
          invalidComboSlotConfiguration(`ya existe un hueco llamado "${data.name ?? ''}" en este combo.`, { name: data.name }),
        );
      }
      throw error;
    }
  }

  async delete(comboDefinitionId: string, slotId: string): Promise<boolean> {
    const existing = await this.prisma.comboSlot.findFirst({ where: { id: slotId, comboDefinitionId }, select: { id: true } });
    if (!existing) return false;
    await this.prisma.comboSlot.delete({ where: { id: slotId } });
    return true;
  }

  private toEntity(slot: SlotWithOptions): ComboSlotEntity {
    return {
      id: slot.id,
      comboDefinitionId: slot.comboDefinitionId,
      name: slot.name,
      nameI18n: asNameI18n(slot.nameI18n),
      minSelections: slot.minSelections,
      maxSelections: slot.maxSelections,
      isRequired: slot.isRequired,
      sortOrder: slot.sortOrder,
      options: slot.options.map((opt): ComboSlotOptionEntity => ({
        id: opt.id,
        restaurantProductId: opt.restaurantProductId,
        name: opt.restaurantProduct.displayName ?? opt.restaurantProduct.product.name,
        supplementPriceCents: opt.supplementPriceCents,
        isDefault: opt.isDefault,
        isAvailable: opt.isAvailable,
        sortOrder: opt.sortOrder,
      })),
    };
  }
}
