import { Inject, Injectable } from '@nestjs/common';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { restaurantNotFound, restaurantProductNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { ok, err, type Result } from '../../../shared/result/result';
import {
  MODIFIER_OPTION_OVERRIDE_REPOSITORY,
  type ModifierOptionForProductEntity,
  type ModifierOptionOverrideRepository,
} from '../ports/modifier-option-override-repository.port';

export type ListModifierOptionOverridesCommand = {
  restaurantId: string;
  restaurantProductId: string;
};

@Injectable()
export class ListModifierOptionOverridesUseCase {
  constructor(
    @Inject(MODIFIER_OPTION_OVERRIDE_REPOSITORY) private readonly repo: ModifierOptionOverrideRepository,
  ) {}

  async execute(command: ListModifierOptionOverridesCommand): Promise<Result<ModifierOptionForProductEntity[], ApplicationError>> {
    try {
      const organizationId = await this.repo.findOrganizationIdByRestaurantId(command.restaurantId);
      if (!organizationId) return err(restaurantNotFound(command.restaurantId));

      const restaurantProductId = await this.repo.findRestaurantProductId(command.restaurantId, command.restaurantProductId);
      if (!restaurantProductId) return err(restaurantProductNotFound(command.restaurantProductId));

      const options = await this.repo.listForRestaurantProduct(restaurantProductId);
      return ok(options);
    } catch (error) {
      if (error instanceof ApplicationErrorException) return err(error.applicationError);
      throw error;
    }
  }
}
