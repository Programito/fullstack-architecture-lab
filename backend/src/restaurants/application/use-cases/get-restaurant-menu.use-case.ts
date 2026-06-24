import { Inject, Injectable } from '@nestjs/common';

import { restaurantNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { RestaurantMenu } from '../../domain/restaurant-read.models';
import { RESTAURANT_ORDER_CATALOG_REPOSITORY, type RestaurantOrderCatalogRepository } from '../ports/restaurant-order-catalog-repository.port';

@Injectable()
export class GetRestaurantMenuUseCase {
  constructor(
    @Inject(RESTAURANT_ORDER_CATALOG_REPOSITORY) private readonly catalog: RestaurantOrderCatalogRepository,
  ) {}

  async execute(restaurantId: string): Promise<Result<RestaurantMenu, ApplicationError>> {
    const menu = await this.catalog.findActiveMenu(restaurantId);
    return menu ? ok(menu) : err(restaurantNotFound(restaurantId));
  }
}
