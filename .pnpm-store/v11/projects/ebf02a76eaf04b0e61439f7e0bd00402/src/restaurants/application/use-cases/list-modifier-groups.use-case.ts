import { Inject, Injectable } from '@nestjs/common';

import { restaurantNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { ok, err, type Result } from '../../../shared/result/result';
import { MODIFIER_GROUP_REPOSITORY, type ModifierGroupEntity, type ModifierGroupRepository } from '../ports/modifier-group-repository.port';

export type ListModifierGroupsCommand = { restaurantId: string; scope?: 'shared' | 'product' };

@Injectable()
export class ListModifierGroupsUseCase {
  constructor(
    @Inject(MODIFIER_GROUP_REPOSITORY) private readonly repo: ModifierGroupRepository,
  ) {}

  async execute(command: ListModifierGroupsCommand): Promise<Result<ModifierGroupEntity[], ApplicationError>> {
    const organizationId = await this.repo.findOrganizationIdByRestaurantId(command.restaurantId);
    if (!organizationId) return err(restaurantNotFound(command.restaurantId));
    return ok(await this.repo.findByOrganizationId(organizationId, command.scope));
  }
}
