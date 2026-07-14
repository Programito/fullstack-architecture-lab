import { Inject, Injectable } from '@nestjs/common';

import { restaurantProductNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import { RESTAURANT_MENU_ADMIN_REPOSITORY, type RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';

export type DeleteRestaurantProductCommand = {
  restaurantId: string;
  productId: string;
};

@Injectable()
export class DeleteRestaurantProductUseCase {
  constructor(
    @Inject(RESTAURANT_MENU_ADMIN_REPOSITORY) private readonly menuAdmin: RestaurantMenuAdminRepository,
  ) {}

  async execute(command: DeleteRestaurantProductCommand): Promise<Result<void, ApplicationError>> {
    const deleted = await this.menuAdmin.deleteProduct(command.restaurantId, command.productId);
    if (!deleted) {
      return err(restaurantProductNotFound(command.productId));
    }
    return ok(undefined);
  }
}
