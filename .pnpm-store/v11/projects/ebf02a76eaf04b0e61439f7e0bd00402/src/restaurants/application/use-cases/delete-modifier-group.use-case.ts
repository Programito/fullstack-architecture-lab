import { Inject, Injectable } from '@nestjs/common';

import { modifierGroupInUse, type ApplicationError } from '../../../shared/errors/application-error';
import { ok, err, type Result } from '../../../shared/result/result';
import { MODIFIER_GROUP_REPOSITORY, type ModifierGroupRepository } from '../ports/modifier-group-repository.port';

export type DeleteModifierGroupCommand = { restaurantId: string; groupId: string };

@Injectable()
export class DeleteModifierGroupUseCase {
  constructor(
    @Inject(MODIFIER_GROUP_REPOSITORY) private readonly repo: ModifierGroupRepository,
  ) {}

  async execute(command: DeleteModifierGroupCommand): Promise<Result<void, ApplicationError>> {
    const inUse = await this.repo.isAssignedToAnyProduct(command.groupId);
    if (inUse) return err(modifierGroupInUse(command.groupId));
    await this.repo.delete(command.groupId);
    return ok(undefined);
  }
}
