import { Inject, Injectable } from '@nestjs/common';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { menuSectionNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { RestaurantMenuItemView } from '../../domain/restaurant-read.models';
import { RESTAURANT_MENU_ADMIN_REPOSITORY, type RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';

export type AddMenuSectionItemCommand = {
  restaurantId: string;
  menuId: string;
  sectionId: string;
  restaurantProductId: string;
  displayNameOverride?: string;
  priceOverrideCents?: number;
};

@Injectable()
export class AddMenuSectionItemUseCase {
  constructor(
    @Inject(RESTAURANT_MENU_ADMIN_REPOSITORY) private readonly menuAdmin: RestaurantMenuAdminRepository,
  ) {}

  async execute(command: AddMenuSectionItemCommand): Promise<Result<RestaurantMenuItemView, ApplicationError>> {
    const section = await this.menuAdmin.findSectionById(command.restaurantId, command.menuId, command.sectionId);
    if (!section) {
      return err(menuSectionNotFound(command.sectionId));
    }

    try {
      const item = await this.menuAdmin.addSectionItem(command.restaurantId, command.menuId, command.sectionId, {
        restaurantProductId: command.restaurantProductId,
        displayNameOverride: command.displayNameOverride,
        priceOverrideCents: command.priceOverrideCents,
      });
      return ok(item);
    } catch (error) {
      if (error instanceof ApplicationErrorException) {
        return err(error.applicationError);
      }
      throw error;
    }
  }
}
