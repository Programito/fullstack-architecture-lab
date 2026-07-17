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

export interface MarkRestaurantServicePointServedCommand {
  restaurantId: string;
  tableId: string;
  lineIds?: string[];
}

@Injectable()
export class MarkRestaurantServicePointOrderServedUseCase {
  constructor(
    @Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository,
    @Inject(RESTAURANT_ORDER_REPOSITORY) private readonly orders: RestaurantOrderRepository,
  ) {}

  async execute(
    command: MarkRestaurantServicePointServedCommand,
  ): Promise<Result<ServicePointDetailView, ApplicationError>> {
    const { restaurantId, tableId, lineIds } = command;
    const floors = await this.restaurants.findFloorsByRestaurantId(restaurantId);

    if (!floors) {
      return err(restaurantNotFound(restaurantId));
    }

    if (!floors.tables.some((table) => table.id === tableId)) {
      return err(tableNotFound(tableId));
    }

    const persistentOrder = await this.orders.findActiveByTable(restaurantId, tableId);

    if (persistentOrder) {
      const activeLineIds = persistentOrder.lines
        .filter((line) => line.status !== 'served' && line.status !== 'cancelled')
        .map((line) => line.id);
      const normalizedLineIds = lineIds?.length
        ? persistentOrder.lines
          .filter((line) =>
            line.status === 'pending' ||
            line.status === 'sent_to_kitchen' ||
            line.status === 'preparing' ||
            line.status === 'ready',
          )
          .map((line) => line.id)
          .filter((lineId) => lineIds.includes(lineId))
        : undefined;

      if (activeLineIds.length === 0 || (lineIds?.length && normalizedLineIds?.length === 0)) {
        return err(invalidServiceAction({ restaurantId, tableId, action: 'mark_served' }));
      }
      await this.orders.markActiveLinesServed(restaurantId, tableId, normalizedLineIds);
      const servicePoint = await this.restaurants.setServicePointStatus(restaurantId, tableId, 'occupied');
      return servicePoint ? ok(servicePoint) : err(tableNotFound(tableId));
    }

    // Demo fallback: no persistent order for this table
    const demoOrder = await this.restaurants.findServicePointOrderByRestaurantId(restaurantId, tableId);
    if (
      lineIds?.length ||
      !demoOrder?.order ||
      demoOrder.lines.length === 0 ||
      !demoOrder.lines.some((line) => line.status !== 'served' && line.status !== 'cancelled')
    ) {
      return err(invalidServiceAction({ restaurantId, tableId, action: 'mark_served' }));
    }
    const servicePoint = await this.restaurants.markServicePointOrderServed(restaurantId, tableId);
    return servicePoint ? ok(servicePoint) : err(tableNotFound(tableId));
  }
}
