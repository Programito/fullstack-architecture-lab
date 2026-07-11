import { Inject, Injectable } from '@nestjs/common';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { productNameTaken, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { Allergen, NameI18n, PreparationRoute, ProductCourse, RestaurantProductDetail } from '../../domain/restaurant-read.models';
import { RESTAURANT_MENU_ADMIN_REPOSITORY, type RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';

export type CreateRestaurantProductCommand = {
  restaurantId: string;
  name: string;
  nameI18n?: NameI18n;
  description?: string;
  course: ProductCourse;
  preparationRoute: PreparationRoute;
  priceCents: number;
  currency: string;
  imageUrl?: string | null;
  modifierGroupIds?: string[];
  allergens?: Allergen[];
};

@Injectable()
export class CreateRestaurantProductUseCase {
  constructor(
    @Inject(RESTAURANT_MENU_ADMIN_REPOSITORY) private readonly menuAdmin: RestaurantMenuAdminRepository,
  ) {}

  async execute(command: CreateRestaurantProductCommand): Promise<Result<RestaurantProductDetail, ApplicationError>> {
    try {
      const product = await this.menuAdmin.createProduct(command.restaurantId, {
        name: command.name,
        nameI18n: command.nameI18n,
        description: command.description,
        course: command.course,
        preparationRoute: command.preparationRoute,
        priceCents: command.priceCents,
        currency: command.currency,
        imageUrl: command.imageUrl,
        modifierGroupIds: command.modifierGroupIds,
        allergens: command.allergens,
      });
      return ok(product);
    } catch (error) {
      if (error instanceof ApplicationErrorException) {
        return err(error.applicationError);
      }
      throw error;
    }
  }
}
