import { Inject, Injectable } from '@nestjs/common';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { restaurantProductNotFound, productNameTaken, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { Allergen, PreparationRoute, ProductCourse, RestaurantProductDetail } from '../../domain/restaurant-read.models';
import { RESTAURANT_MENU_ADMIN_REPOSITORY, type RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';

export type UpdateRestaurantProductCommand = {
  restaurantId: string;
  productId: string;
  name?: string;
  description?: string | null;
  course?: ProductCourse;
  preparationRoute?: PreparationRoute;
  priceCents?: number;
  isAvailable?: boolean;
  isVisible?: boolean;
  imageUrl?: string | null;
  modifierGroupIds?: string[];
  allergens?: Allergen[];
};

@Injectable()
export class UpdateRestaurantProductUseCase {
  constructor(
    @Inject(RESTAURANT_MENU_ADMIN_REPOSITORY) private readonly menuAdmin: RestaurantMenuAdminRepository,
  ) {}

  async execute(command: UpdateRestaurantProductCommand): Promise<Result<RestaurantProductDetail, ApplicationError>> {
    try {
      const product = await this.menuAdmin.updateProduct(command.restaurantId, command.productId, {
        name: command.name,
        description: command.description,
        course: command.course,
        preparationRoute: command.preparationRoute,
        priceCents: command.priceCents,
        isAvailable: command.isAvailable,
        isVisible: command.isVisible,
        imageUrl: command.imageUrl,
        modifierGroupIds: command.modifierGroupIds,
        allergens: command.allergens,
      });
      if (!product) {
        return err(restaurantProductNotFound(command.productId));
      }
      return ok(product);
    } catch (error) {
      if (error instanceof ApplicationErrorException) {
        return err(error.applicationError);
      }
      throw error;
    }
  }
}
