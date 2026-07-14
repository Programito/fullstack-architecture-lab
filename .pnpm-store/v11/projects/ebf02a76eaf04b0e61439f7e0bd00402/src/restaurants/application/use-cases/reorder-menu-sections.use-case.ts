import { Inject, Injectable } from '@nestjs/common';

import { menuNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import { RESTAURANT_MENU_ADMIN_REPOSITORY, type RestaurantMenuAdminRepository, type SortOrderItem } from '../ports/restaurant-menu-admin-repository.port';

export type ReorderMenuSectionsCommand = {
  restaurantId: string;
  menuId: string;
  items: SortOrderItem[];
};

@Injectable()
export class ReorderMenuSectionsUseCase {
  constructor(
    @Inject(RESTAURANT_MENU_ADMIN_REPOSITORY) private readonly menuAdmin: RestaurantMenuAdminRepository,
  ) {}

  async execute(command: ReorderMenuSectionsCommand): Promise<Result<void, ApplicationError>> {
    const menu = await this.menuAdmin.findMenuById(command.restaurantId, command.menuId);
    if (!menu) {
      return err(menuNotFound(command.menuId));
    }

    await this.menuAdmin.reorderSections(command.restaurantId, command.menuId, command.items);
    return ok(undefined);
  }
}
