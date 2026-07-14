import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import type {
  CreatePlatterComponentData,
  PlatterComponentEntity,
  PlatterComponentRepository,
  ResolvePlatterProductContextResult,
  UpdatePlatterComponentData,
} from '../../application/ports/platter-component-repository.port';
import { asNameI18n, toNameI18nJson } from './name-i18n.mapper';

type ComponentRow = {
  id: string;
  platterDefinitionId: string;
  componentProductId: string | null;
  name: string;
  nameI18n: unknown;
  quantity: number | null;
  isRemovable: boolean;
  isReplaceable: boolean;
  sortOrder: number;
};

@Injectable()
export class PrismaPlatterComponentRepository implements PlatterComponentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async resolvePlatterProductContext(restaurantId: string, restaurantProductId: string): Promise<ResolvePlatterProductContextResult> {
    const rp = await this.prisma.restaurantProduct.findFirst({
      where: { id: restaurantProductId, restaurantId },
      select: { id: true, productId: true, product: { select: { productType: true, organizationId: true } } },
    });
    if (!rp) return { status: 'not_found' };
    if (rp.product.productType !== 'platter') return { status: 'not_platter' };

    // No dedicated endpoint to create a PlatterDefinition (1:1 by productId,
    // required for any platter product) — provision it lazily on first use,
    // same as ComboDefinition for combo slots.
    const platterDefinition = await this.prisma.platterDefinition.upsert({
      where: { productId: rp.productId },
      update: {},
      create: { productId: rp.productId },
      select: { id: true },
    });

    return {
      status: 'ok',
      context: {
        restaurantProductId: rp.id,
        productId: rp.productId,
        organizationId: rp.product.organizationId,
        platterDefinitionId: platterDefinition.id,
      },
    };
  }

  async findById(platterDefinitionId: string, componentId: string): Promise<PlatterComponentEntity | null> {
    const component = await this.prisma.platterComponent.findFirst({
      where: { id: componentId, platterDefinitionId },
    });
    return component ? this.toEntity(component) : null;
  }

  async isComponentProductValid(organizationId: string, componentProductId: string): Promise<boolean> {
    const count = await this.prisma.product.count({ where: { id: componentProductId, organizationId } });
    return count === 1;
  }

  async create(platterDefinitionId: string, data: CreatePlatterComponentData): Promise<PlatterComponentEntity> {
    const count = await this.prisma.platterComponent.count({ where: { platterDefinitionId } });
    const component = await this.prisma.platterComponent.create({
      data: {
        platterDefinitionId,
        componentProductId: data.componentProductId ?? null,
        name: data.name,
        nameI18n: toNameI18nJson(data.nameI18n),
        quantity: data.quantity ?? null,
        isRemovable: data.isRemovable,
        isReplaceable: data.isReplaceable,
        sortOrder: count + 1,
      },
    });
    return this.toEntity(component);
  }

  async update(platterDefinitionId: string, componentId: string, data: UpdatePlatterComponentData): Promise<PlatterComponentEntity | null> {
    const existing = await this.prisma.platterComponent.findFirst({ where: { id: componentId, platterDefinitionId }, select: { id: true } });
    if (!existing) return null;

    const component = await this.prisma.platterComponent.update({
      where: { id: componentId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.nameI18n !== undefined && { nameI18n: toNameI18nJson(data.nameI18n) }),
        ...(data.componentProductId !== undefined && { componentProductId: data.componentProductId }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.isRemovable !== undefined && { isRemovable: data.isRemovable }),
        ...(data.isReplaceable !== undefined && { isReplaceable: data.isReplaceable }),
      },
    });
    return this.toEntity(component);
  }

  async delete(platterDefinitionId: string, componentId: string): Promise<boolean> {
    const existing = await this.prisma.platterComponent.findFirst({ where: { id: componentId, platterDefinitionId }, select: { id: true } });
    if (!existing) return false;
    await this.prisma.platterComponent.delete({ where: { id: componentId } });
    return true;
  }

  private toEntity(component: ComponentRow): PlatterComponentEntity {
    return {
      id: component.id,
      platterDefinitionId: component.platterDefinitionId,
      componentProductId: component.componentProductId,
      name: component.name,
      nameI18n: asNameI18n(component.nameI18n),
      quantity: component.quantity,
      isRemovable: component.isRemovable,
      isReplaceable: component.isReplaceable,
      sortOrder: component.sortOrder,
    };
  }
}
