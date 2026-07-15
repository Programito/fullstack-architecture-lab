import { Inject, Injectable } from '@nestjs/common';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import {
  invalidModifierOptionOverride,
  modifierOptionNotFound,
  restaurantNotFound,
  restaurantProductNotFound,
  type ApplicationError,
} from '../../../shared/errors/application-error';
import { ok, err, type Result } from '../../../shared/result/result';
import {
  MODIFIER_OPTION_OVERRIDE_REPOSITORY,
  type ModifierOptionForProductEntity,
  type ModifierOptionOverrideRepository,
} from '../ports/modifier-option-override-repository.port';

export type SetModifierOptionPriceOverrideCommand = {
  restaurantId: string;
  restaurantProductId: string;
  modifierOptionId: string;
  priceDeltaCents: number;
};

@Injectable()
export class SetModifierOptionPriceOverrideUseCase {
  constructor(
    @Inject(MODIFIER_OPTION_OVERRIDE_REPOSITORY) private readonly repo: ModifierOptionOverrideRepository,
  ) {}

  async execute(command: SetModifierOptionPriceOverrideCommand): Promise<Result<ModifierOptionForProductEntity, ApplicationError>> {
    try {
      if (!Number.isInteger(command.priceDeltaCents) || command.priceDeltaCents < 0) {
        return err(invalidModifierOptionOverride('priceDeltaCents must be a non-negative integer', { priceDeltaCents: command.priceDeltaCents }));
      }

      const organizationId = await this.repo.findOrganizationIdByRestaurantId(command.restaurantId);
      if (!organizationId) return err(restaurantNotFound(command.restaurantId));

      const restaurantProductId = await this.repo.findRestaurantProductId(command.restaurantId, command.restaurantProductId);
      if (!restaurantProductId) return err(restaurantProductNotFound(command.restaurantProductId));

      const optionOrganizationId = await this.repo.findModifierOptionOrganizationId(command.modifierOptionId);
      if (!optionOrganizationId || optionOrganizationId !== organizationId) {
        return err(modifierOptionNotFound(command.modifierOptionId));
      }

      const override = await this.repo.setOverride({
        restaurantProductId,
        modifierOptionId: command.modifierOptionId,
        priceDeltaCents: command.priceDeltaCents,
      });
      return ok(override);
    } catch (error) {
      if (error instanceof ApplicationErrorException) return err(error.applicationError);
      throw error;
    }
  }
}
