import { Inject, Injectable } from '@nestjs/common';

import { menuSectionNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import { RESTAURANT_MENU_ADMIN_REPOSITORY, type RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';

export type DeleteMenuSectionCommand = {
  restaurantId: string;
  menuId: string;
  sectionId: string;
};

@Injectable()
export class DeleteMenuSectionUseCase {
  constructor(
    @Inject(RESTAURANT_MENU_ADMIN_REPOSITORY) private readonly menuAdmin: RestaurantMenuAdminRepository,
  ) {}

  async execute(command: DeleteMenuSectionCommand): Promise<Result<void, ApplicationError>> {
    const deleted = await this.menuAdmin.deleteSection(command.restaurantId, command.menuId, command.sectionId);
    return deleted ? ok(undefined) : err(menuSectionNotFound(command.sectionId));
  }
}
