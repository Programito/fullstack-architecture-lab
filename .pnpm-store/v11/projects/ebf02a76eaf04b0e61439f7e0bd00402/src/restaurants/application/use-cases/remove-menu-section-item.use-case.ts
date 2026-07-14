import { Inject, Injectable } from '@nestjs/common';

import { menuItemNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import { RESTAURANT_MENU_ADMIN_REPOSITORY, type RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';

export type RemoveMenuSectionItemCommand = {
  restaurantId: string;
  menuId: string;
  sectionId: string;
  itemId: string;
};

@Injectable()
export class RemoveMenuSectionItemUseCase {
  constructor(
    @Inject(RESTAURANT_MENU_ADMIN_REPOSITORY) private readonly menuAdmin: RestaurantMenuAdminRepository,
  ) {}

  async execute(command: RemoveMenuSectionItemCommand): Promise<Result<void, ApplicationError>> {
    const removed = await this.menuAdmin.removeSectionItem(
      command.restaurantId,
      command.menuId,
      command.sectionId,
      command.itemId,
    );
    return removed ? ok(undefined) : err(menuItemNotFound(command.itemId));
  }
}
