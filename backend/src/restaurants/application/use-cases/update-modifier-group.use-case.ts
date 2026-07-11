import { Inject, Injectable } from '@nestjs/common';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { modifierGroupNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { ok, err, type Result } from '../../../shared/result/result';
import { MODIFIER_GROUP_REPOSITORY, type ModifierGroupEntity, type ModifierGroupRepository } from '../ports/modifier-group-repository.port';
import type { NameI18n } from '../../domain/restaurant-read.models';

export type UpdateModifierGroupCommand = {
  restaurantId: string;
  groupId: string;
  name: string;
  nameI18n?: NameI18n;
  selectionType: 'single' | 'multiple';
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: { name: string; nameI18n?: NameI18n; priceDeltaCents: number; imageUrl?: string }[];
};

@Injectable()
export class UpdateModifierGroupUseCase {
  constructor(
    @Inject(MODIFIER_GROUP_REPOSITORY) private readonly repo: ModifierGroupRepository,
  ) {}

  async execute(command: UpdateModifierGroupCommand): Promise<Result<ModifierGroupEntity, ApplicationError>> {
    try {
      const existing = await this.repo.findById(command.groupId);
      if (!existing) return err(modifierGroupNotFound(command.groupId));

      const group = await this.repo.update({
        groupId: command.groupId,
        name: command.name,
        nameI18n: command.nameI18n,
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
