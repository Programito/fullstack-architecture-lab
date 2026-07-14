import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { RestaurantServiceWindowsRepository } from '../../application/ports/restaurant-service-windows-repository.port';
import type { ServiceWindow, UpdateServiceWindowInput } from '../../domain/restaurant-read.models';

@Injectable()
export class PrismaRestaurantServiceWindowsRepository implements RestaurantServiceWindowsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findServiceWindowsByRestaurantId(restaurantId: string): Promise<ServiceWindow[] | null> {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) return null;

    const windows = await this.prisma.restaurantServiceWindow.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return windows.map(mapServiceWindow);
  }

  async updateServiceWindows(restaurantId: string, windows: UpdateServiceWindowInput[]): Promise<ServiceWindow[] | null> {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) return null;

    await this.prisma.restaurantServiceWindow.deleteMany({ where: { restaurantId } });

    const created = await this.prisma.$transaction(
      windows.map((w, index) =>
        this.prisma.restaurantServiceWindow.create({
          data: {
            restaurantId,
            name: w.name,
            startTime: w.startTime,
            endTime: w.endTime,
            sortOrder: index,
            isActive: true,
          },
        }),
      ),
    );

    return created.map(mapServiceWindow);
  }
}

function mapServiceWindow(w: {
  id: string;
  restaurantId: string;
  name: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
}): ServiceWindow {
  return {
    id: w.id,
    restaurantId: w.restaurantId,
    name: w.name,
    startTime: w.startTime,
    endTime: w.endTime,
    sortOrder: w.sortOrder,
  };
}
