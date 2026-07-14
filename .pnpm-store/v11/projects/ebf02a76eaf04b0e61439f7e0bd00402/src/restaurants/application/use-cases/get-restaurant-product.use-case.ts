import { Inject, Injectable } from '@nestjs/common';

import { restaurantProductNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { RestaurantProductDetail } from '../../domain/restaurant-read.models';
import { RESTAURANT_MENU_ADMIN_REPOSITORY, type RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';

export type GetRestaurantProductCommand = {
  restaurantId: string;
  productId: string;
};

@Injectable()
export class GetRestaurantProductUseCase {
  constructor(
    @Inject(RESTAURANT_MENU_ADMIN_REPOSITORY) private readonly menuAdmin: RestaurantMenuAdminRepository,
  ) {}

  async execute(command: GetRestaurantProductCommand): Promise<Result<RestaurantProductDetail, ApplicationError>> {
    const product = await this.menuAdmin.findRestaurantProductById(command.restaurantId, command.productId);
    if (!product) {
      return err(restaurantProductNotFound(command.productId));
    }
    return ok(product);
  }
}
