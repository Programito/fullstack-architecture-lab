import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { modifierGroupNameTaken } from '../../../shared/errors/application-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { CreateModifierGroupData, ModifierGroupEntity, ModifierGroupRepository } from '../../application/ports/modifier-group-repository.port';

type GroupWithOptions = Prisma.ModifierGroupGetPayload<{ include: { options: true } }>;

@Injectable()
export class PrismaModifierGroupRepository implements ModifierGroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrganizationIdByRestaurantId(restaurantId: string): Promise<string | null> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { organizationId: true },
    });
    return restaurant?.organizationId ?? null;
  }

  async findByOrganizationId(organizationId: string): Promise<ModifierGroupEntity[]> {
    const groups = await this.prisma.modifierGroup.findMany({
      where: { organizationId },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    return groups.map(this.toEntity);
  }

  async create(data: CreateModifierGroupData): Promise<ModifierGroupEntity> {
    try {
      const group = await this.prisma.modifierGroup.create({
        data: {
          organizationId: data.organizationId,
          name: data.name,
          selectionType: data.selectionType,
          minSelections: data.minSelections,
          maxSelections: data.maxSelections,
          isRequired: data.isRequired,
          options: {
            createMany: {
              data: data.options.map((opt, i) => ({
                name: opt.name,
                priceDeltaCents: opt.priceDeltaCents,
                sortOrder: i + 1,
              })),
            },
          },
        },
        include: { options: { orderBy: { sortOrder: 'asc' } } },
      });
      return this.toEntity(group);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApplicationErrorException(modifierGroupNameTaken(data.name));
      }
      throw error;
    }
  }

  async isAssignedToAnyProduct(groupId: string): Promise<boolean> {
    const count = await this.prisma.restaurantProductModifierGroup.count({
      where: { modifierGroupId: groupId },
    });
    return count > 0;
  }

  async delete(groupId: string): Promise<void> {
    await this.prisma.modifierGroup.delete({ where: { id: groupId } });
  }

  private toEntity(group: GroupWithOptions): ModifierGroupEntity {
    return {
      id: group.id,
      organizationId: group.organizationId,
      name: group.name,
      selectionType: group.selectionType as 'single' | 'multiple',
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      isRequired: group.isRequired,
      options: group.options.map((opt) => ({
        id: opt.id,
        name: opt.name,
        priceDeltaCents: opt.priceDeltaCents,
        isAvailable: opt.isAvailable,
      })),
    };
  }
}
