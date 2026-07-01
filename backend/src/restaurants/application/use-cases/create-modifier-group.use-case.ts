import { Inject, Injectable } from '@nestjs/common';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { restaurantNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { ok, err, type Result } from '../../../shared/result/result';
import { MODIFIER_GROUP_REPOSITORY, type ModifierGroupEntity, type ModifierGroupRepository } from '../ports/modifier-group-repository.port';

export type CreateModifierGroupCommand = {
  restaurantId: string;
  name: string;
  selectionType: 'single' | 'multiple';
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: { name: string; priceDeltaCents: number }[];
};

@Injectable()
export class CreateModifierGroupUseCase {
  constructor(
    @Inject(MODIFIER_GROUP_REPOSITORY) private readonly repo: ModifierGroupRepository,
  ) {}

  async execute(command: CreateModifierGroupCommand): Promise<Result<ModifierGroupEntity, ApplicationError>> {
    try {
      const organizationId = await this.repo.findOrganizationIdByRestaurantId(command.restaurantId);
      if (!organizationId) return err(restaurantNotFound(command.restaurantId));

      const group = await this.repo.create({
        organizationId,
        name: command.name,
        selectionType: command.selectionType,
        minSelections: command.minSelections,
        maxSelections: command.maxSelections,
        isRequired: command.isRequired,
        options: command.options,
      });
      return ok(group);
    } catch (error) {
      if (error instanceof ApplicationErrorException) return err(error.applicationError);
      throw error;
    }
  }
}
