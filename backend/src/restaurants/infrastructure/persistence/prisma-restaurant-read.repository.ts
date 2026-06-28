import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import { DemoRestaurantReadRepository } from '../demo-restaurant-read.repository';
import type { RestaurantReservation, RestaurantSummary } from '../../domain/restaurant-read.models';

@Injectable()
export class PrismaRestaurantReadRepository extends DemoRestaurantReadRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  override async listRestaurants(): Promise<RestaurantSummary[]> {
    if (!this.shouldUsePrisma()) {
      return super.listRestaurants();
    }

    try {
      const restaurants = await this.prisma.restaurant.findMany({
        orderBy: { name: 'asc' },
      });

      return restaurants.map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        displayName: restaurant.displayName,
        timezone: restaurant.timezone,
        currency: restaurant.currency,
        isActive: restaurant.isActive,
      }));
    } catch (error: unknown) {
      if (this.shouldFallbackToDemo(error)) {
        return super.listRestaurants();
      }
      throw error;
    }
  }

  override async listReservationsByRestaurantId(
    restaurantId: string,
    date?: string,
  ): Promise<RestaurantReservation[] | null> {
    if (!this.shouldUsePrisma()) {
      return super.listReservationsByRestaurantId(restaurantId, date);
    }

    try {
      const reservations = await this.prisma.reservation.findMany({
        where: {
          restaurantId,
          ...(date
            ? {
                reservationAt: {
                  gte: new Date(`${date}T00:00:00.000Z`),
                  lt: new Date(`${date}T23:59:59.999Z`),
                },
              }
            : {}),
        },
        include: {
          tables: {
            include: {
              table: true,
            },
          },
        },
        orderBy: { reservationAt: 'asc' },
      });

      return reservations.map((reservation) => ({
        id: reservation.id,
        customerId: reservation.customerId,
        customerNameSnapshot: reservation.customerNameSnapshot,
        customerPhoneSnapshot: reservation.customerPhoneSnapshot,
        partySize: reservation.partySize,
        reservationAt: reservation.reservationAt.toISOString(),
        durationMinutes: reservation.durationMinutes,
        status: reservation.status,
        notes: reservation.notes,
        tableIds: reservation.tables.map(({ tableId }) => tableId),
        tables: reservation.tables.map(({ table }) => ({
          id: table.id,
          tableNumber: table.tableNumber,
          name: table.name,
        })),
      }));
    } catch (error: unknown) {
      if (this.shouldFallbackToDemo(error)) {
        return super.listReservationsByRestaurantId(restaurantId, date);
      }
      throw error;
    }
  }

  private shouldUsePrisma(): boolean {
    return Boolean(process.env.DATABASE_URL);
  }

  private shouldFallbackToDemo(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientInitializationError;
  }
}
