import { Inject, Injectable } from '@nestjs/common';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { menuNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { RestaurantMenuSectionView } from '../../domain/restaurant-read.models';
import { RESTAURANT_MENU_ADMIN_REPOSITORY, type RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';

export type CreateMenuSectionCommand = {
  restaurantId: string;
  menuId: string;
  name: string;
  isVisible?: boolean;
};

@Injectable()
export class CreateMenuSectionUseCase {
  constructor(
    @Inject(RESTAURANT_MENU_ADMIN_REPOSITORY) private readonly menuAdmin: RestaurantMenuAdminRepository,
  ) {}

  async execute(command: CreateMenuSectionCommand): Promise<Result<RestaurantMenuSectionView, ApplicationError>> {
    const menu = await this.menuAdmin.findMenuById(command.restaurantId, command.menuId);
    if (!menu) {
      return err(menuNotFound(command.menuId));
    }

    try {
      const section = await this.menuAdmin.createSection(command.restaurantId, command.menuId, {
        name: command.name,
        isVisible: command.isVisible ?? true,
      });
      return ok(section);
    } catch (error) {
      if (error instanceof ApplicationErrorException) {
        return err(error.applicationError);
      }
      throw error;
    }
  }
}
