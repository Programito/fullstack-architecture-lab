import { Inject, Injectable } from '@nestjs/common';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { menuSectionNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { NameI18n, RestaurantMenuSectionView } from '../../domain/restaurant-read.models';
import { RESTAURANT_MENU_ADMIN_REPOSITORY, type RestaurantMenuAdminRepository } from '../ports/restaurant-menu-admin-repository.port';

export type UpdateMenuSectionCommand = {
  restaurantId: string;
  menuId: string;
  sectionId: string;
  name?: string;
  nameI18n?: NameI18n;
  isVisible?: boolean;
};

@Injectable()
export class UpdateMenuSectionUseCase {
  constructor(
    @Inject(RESTAURANT_MENU_ADMIN_REPOSITORY) private readonly menuAdmin: RestaurantMenuAdminRepository,
  ) {}

  async execute(command: UpdateMenuSectionCommand): Promise<Result<RestaurantMenuSectionView, ApplicationError>> {
    const { restaurantId, menuId, sectionId, ...data } = command;

    try {
      const section = await this.menuAdmin.updateSection(restaurantId, menuId, sectionId, data);
      if (!section) {
        return err(menuSectionNotFound(sectionId));
      }
      return ok(section);
    } catch (error) {
      if (error instanceof ApplicationErrorException) {
        return err(error.applicationError);
      }
      throw error;
    }
  }
}
