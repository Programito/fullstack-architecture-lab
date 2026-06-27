import { Inject, Injectable } from '@nestjs/common';

import { type ApplicationError } from '../../../shared/errors/application-error';
import { ok, type Result } from '../../../shared/result/result';
import type { RestaurantProductSummary } from '../../domain/restaurant-read.models';
import { RESTAURANT_MENU_ADMIN_REPOSITORY, type RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';

@Injectable()
export class ListRestaurantProductsUseCase {
  constructor(
    @Inject(RESTAURANT_MENU_ADMIN_REPOSITORY) private readonly menuAdmin: RestaurantMenuAdminRepository,
  ) {}

  async execute(restaurantId: string): Promise<Result<RestaurantProductSummary[], ApplicationError>> {
    const products = await this.menuAdmin.listRestaurantProducts(restaurantId);
    return ok(products);
  }
}
