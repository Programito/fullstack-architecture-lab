import { Inject, Injectable } from '@nestjs/common';

import {
  invalidServiceAction,
  restaurantNotFound,
  tableNotFound,
  type ApplicationError,
} from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { ServicePointDetailView } from '../../domain/service-floor.models';
import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../ports/restaurant-read-repository.port';
import { RESTAURANT_ORDER_REPOSITORY, type RestaurantOrderRepository } from '../ports/restaurant-order-repository.port';

@Injectable()
export class SendRestaurantServicePointOrderToKitchenUseCase {
  constructor(
    @Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository,
    @Inject(RESTAURANT_ORDER_REPOSITORY) private readonly orders: RestaurantOrderRepository,
  ) {}

  async execute(
    restaurantId: string,
    tableId: string,
    lineIds?: string[],
  ): Promise<Result<ServicePointDetailView, ApplicationError>> {
    const floors = await this.restaurants.findFloorsByRestaurantId(restaurantId);

    if (!floors) {
      return err(restaurantNotFound(restaurantId));
    }

    if (!floors.tables.some((table) => table.id === tableId)) {
      return err(tableNotFound(tableId));
    }

    const persistentOrder = await this.orders.findActiveByTable(restaurantId, tableId);

    if (persistentOrder) {
      const pendingLines = persistentOrder.lines.filter((line) => line.status === 'pending');
      const eligibleLines = lineIds ? pendingLines.filter((line) => lineIds.includes(line.id)) : pendingLines;

      if (eligibleLines.length === 0) {
        return err(invalidServiceAction({ restaurantId, tableId, action: 'send_to_kitchen' }));
      }
      if (lineIds) {
        await this.orders.sendPendingLinesToKitchen(restaurantId, tableId, lineIds);
      } else {
        await this.orders.sendPendingLinesToKitchen(restaurantId, tableId);
      }
      const servicePoint = await this.restaurants.setServicePointStatus(restaurantId, tableId, 'waiting_kitchen');
      return servicePoint ? ok(servicePoint) : err(tableNotFound(tableId));
    }

    // Demo fallback: no persistent order for this table
    const demoOrder = await this.restaurants.findServicePointOrderByRestaurantId(restaurantId, tableId);
    if (!demoOrder?.order || demoOrder.lines.length === 0 || !demoOrder.lines.some((line) => line.status === 'pending')) {
      return err(invalidServiceAction({ restaurantId, tableId, action: 'send_to_kitchen' }));
    }
    const servicePoint = await this.restaurants.sendServicePointOrderToKitchen(restaurantId, tableId);
    return servicePoint ? ok(servicePoint) : err(tableNotFound(tableId));
  }
}
