import { Inject, Injectable } from '@nestjs/common';

import { restaurantNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import { RESTAURANT_ORDER_CATALOG_REPOSITORY, type RestaurantOrderCatalogRepository } from '../ports/restaurant-order-catalog-repository.port';

@Injectable()
export class SetRestaurantMenuItemAvailabilityUseCase {
  constructor(
    @Inject(RESTAURANT_ORDER_CATALOG_REPOSITORY) private readonly catalog: RestaurantOrderCatalogRepository,
  ) {}

  async execute(restaurantId: string, restaurantProductId: string, available: boolean): Promise<Result<void, ApplicationError>> {
    const found = await this.catalog.setItemAvailability(restaurantId, restaurantProductId, available);
    return found ? ok(undefined) : err(restaurantNotFound(restaurantId));
  }
}
