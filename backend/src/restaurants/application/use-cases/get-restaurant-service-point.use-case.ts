import { Inject, Injectable } from '@nestjs/common';

import { restaurantNotFound, tableNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { ServicePointDetailView } from '../../domain/service-floor.models';
import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../ports/restaurant-read-repository.port';

@Injectable()
export class GetRestaurantServicePointUseCase {
  constructor(@Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository) {}

  async execute(restaurantId: string, tableId: string): Promise<Result<ServicePointDetailView, ApplicationError>> {
    const floors = await this.restaurants.findFloorsByRestaurantId(restaurantId);

    if (!floors) {
      return err(restaurantNotFound(restaurantId));
    }

    if (!floors.tables.some((table) => table.id === tableId)) {
      return err(tableNotFound(tableId));
    }

    const servicePoint = await this.restaurants.findServicePointByRestaurantId(restaurantId, tableId);
    return servicePoint ? ok(servicePoint) : err(tableNotFound(tableId));
  }
}
