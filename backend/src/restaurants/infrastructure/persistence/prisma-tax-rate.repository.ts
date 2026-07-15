import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { taxRateNameTaken } from '../../../shared/errors/application-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { CreateTaxRateData, TaxRateEntity, TaxRateRepository, UpdateTaxRateData } from '../../application/ports/tax-rate-repository.port';

type PrismaTaxRate = { id: string; organizationId: string; name: string; ratePercent: Prisma.Decimal; isActive: boolean };

@Injectable()
export class PrismaTaxRateRepository implements TaxRateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrganizationIdByRestaurantId(restaurantId: string): Promise<string | null> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { organizationId: true },
    });
    return restaurant?.organizationId ?? null;
  }

  async findByOrganizationId(organizationId: string): Promise<TaxRateEntity[]> {
    const taxRates = await this.prisma.taxRate.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
    return taxRates.map(this.toEntity);
  }

  async findById(taxRateId: string): Promise<TaxRateEntity | null> {
    const taxRate = await this.prisma.taxRate.findUnique({ where: { id: taxRateId } });
    return taxRate ? this.toEntity(taxRate) : null;
  }

  async create(data: CreateTaxRateData): Promise<TaxRateEntity> {
    try {
      const taxRate = await this.prisma.taxRate.create({
        data: {
          organizationId: data.organizationId,
          name: data.name,
          ratePercent: data.ratePercent,
          isActive: data.isActive ?? true,
        },
      });
      return this.toEntity(taxRate);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApplicationErrorException(taxRateNameTaken(data.name));
      }
      throw error;
    }
  }

  async update(data: UpdateTaxRateData): Promise<TaxRateEntity> {
    try {
      const taxRate = await this.prisma.taxRate.update({
        where: { id: data.taxRateId },
        data: {
          name: data.name,
          ratePercent: data.ratePercent,
          isActive: data.isActive,
        },
      });
      return this.toEntity(taxRate);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApplicationErrorException(taxRateNameTaken(data.name ?? ''));
      }
      throw error;
    }
  }

  async isAssignedToAnyProduct(taxRateId: string): Promise<boolean> {
    const count = await this.prisma.product.count({ where: { taxRateId } });
    return count > 0;
  }

  async delete(taxRateId: string): Promise<void> {
    await this.prisma.taxRate.delete({ where: { id: taxRateId } });
  }

  private toEntity(taxRate: PrismaTaxRate): TaxRateEntity {
    return {
      id: taxRate.id,
      organizationId: taxRate.organizationId,
      name: taxRate.name,
      ratePercent: Number(taxRate.ratePercent.toString()),
      isActive: taxRate.isActive,
    };
  }
}
