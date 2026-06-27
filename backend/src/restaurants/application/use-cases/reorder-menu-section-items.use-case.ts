import { Inject, Injectable } from '@nestjs/common';

import { menuSectionNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import { RESTAURANT_MENU_ADMIN_REPOSITORY, type RestaurantMenuAdminRepository, type SortOrderItem } from '../ports/restaurant-menu-admin-repository.port';

export type ReorderMenuSectionItemsCommand = {
  restaurantId: string;
  menuId: string;
  sectionId: string;
  items: SortOrderItem[];
};

@Injectable()
export class ReorderMenuSectionItemsUseCase {
  constructor(
    @Inject(RESTAURANT_MENU_ADMIN_REPOSITORY) private readonly menuAdmin: RestaurantMenuAdminRepository,
  ) {}

  async execute(command: ReorderMenuSectionItemsCommand): Promise<Result<void, ApplicationError>> {
    const section = await this.menuAdmin.findSectionById(command.restaurantId, command.menuId, command.sectionId);
    if (!section) {
      return err(menuSectionNotFound(command.sectionId));
    }

    await this.menuAdmin.reorderSectionItems(command.restaurantId, command.menuId, command.sectionId, command.items);
    return ok(undefined);
  }
}
