import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { CustomerRepository } from '../../application/ports/customer-repository.port';
import type { CreateCustomerInput, Customer, CustomerSummary } from '../../domain/restaurant-read.models';

@Injectable()
export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async searchByRestaurantId(restaurantId: string, q: string): Promise<CustomerSummary[] | null> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { organizationId: true },
    });
    if (!restaurant) {
      return null;
    }

    const term = q.trim();
    const customers = await this.prisma.customer.findMany({
      where: {
        organizationId: restaurant.organizationId,
        ...(term.length > 0
          ? {
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { phone: { contains: term } },
                { email: { contains: term, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ name: 'asc' }],
      take: 20,
    });

    return customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      visitCount: 0,
      noShowCount: 0,
      cancelCount: 0,
      lateCount: 0,
    }));
  }

  async createForRestaurant(
    restaurantId: string,
    data: CreateCustomerInput,
  ): Promise<Customer | 'restaurant_not_found' | 'already_exists'> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { organizationId: true },
    });
    if (!restaurant) {
      return 'restaurant_not_found';
    }

    const normalizedName = data.name.trim();
    const normalizedPhone = data.phone?.trim() || null;
    const normalizedEmail = data.email?.trim().toLowerCase() || null;
    const normalizedNotes = data.notes?.trim() || null;

    const duplicate = await this.prisma.customer.findFirst({
      where: {
        organizationId: restaurant.organizationId,
        OR: [
          {
            name: normalizedName,
            phone: normalizedPhone,
          },
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ],
      },
      select: { id: true },
    });
    if (duplicate) {
      return 'already_exists';
    }

    const customer = await this.prisma.customer.create({
      data: {
        organizationId: restaurant.organizationId,
        name: normalizedName,
        phone: normalizedPhone,
        email: normalizedEmail,
        notes: normalizedNotes,
      },
    });

    return {
      id: customer.id,
      organizationId: customer.organizationId,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes,
      visitCount: 0,
      noShowCount: 0,
      cancelCount: 0,
      lateCount: 0,
    };
  }
}
