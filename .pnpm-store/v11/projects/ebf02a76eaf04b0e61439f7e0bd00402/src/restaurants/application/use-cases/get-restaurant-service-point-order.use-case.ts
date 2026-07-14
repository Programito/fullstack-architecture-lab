import { Inject, Injectable } from '@nestjs/common';

import { restaurantNotFound, tableNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { ServicePointOrderView } from '../../domain/service-floor.models';
import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../ports/restaurant-read-repository.port';

@Injectable()
export class GetRestaurantServicePointOrderUseCase {
  constructor(@Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository) {}

  async execute(restaurantId: string, tableId: string): Promise<Result<ServicePointOrderView, ApplicationError>> {
    const floors = await this.restaurants.findFloorsByRestaurantId(restaurantId);

    if (!floors) {
      return err(restaurantNotFound(restaurantId));
    }

    if (!floors.tables.some((table) => table.id === tableId)) {
      return err(tableNotFound(tableId));
    }

    const order = await this.restaurants.findServicePointOrderByRestaurantId(restaurantId, tableId);
    return order ? ok(order) : ok({ order: null, lines: [] });
  }
}
