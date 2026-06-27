import { Inject, Injectable } from '@nestjs/common';

import { menuItemNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { RestaurantMenuItemView } from '../../domain/restaurant-read.models';
import { RESTAURANT_MENU_ADMIN_REPOSITORY, type RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';

export type UpdateMenuSectionItemCommand = {
  restaurantId: string;
  menuId: string;
  sectionId: string;
  itemId: string;
  displayNameOverride?: string | null;
  priceOverrideCents?: number | null;
  isVisible?: boolean;
};

@Injectable()
export class UpdateMenuSectionItemUseCase {
  constructor(
    @Inject(RESTAURANT_MENU_ADMIN_REPOSITORY) private readonly menuAdmin: RestaurantMenuAdminRepository,
  ) {}

  async execute(command: UpdateMenuSectionItemCommand): Promise<Result<RestaurantMenuItemView, ApplicationError>> {
    const { restaurantId, menuId, sectionId, itemId, ...data } = command;

    const item = await this.menuAdmin.updateSectionItem(restaurantId, menuId, sectionId, itemId, data);
    if (!item) {
      return err(menuItemNotFound(itemId));
    }
    return ok(item);
  }
}
