import { Inject, Injectable } from '@nestjs/common';

import { comboSlotNotFound, invalidComboSlotConfiguration, restaurantProductNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import { COMBO_SLOT_REPOSITORY, type ComboSlotRepository } from '../ports/combo-slot-repository.port';

export type DeleteComboSlotCommand = {
  restaurantId: string;
  productId: string;
  slotId: string;
};

@Injectable()
export class DeleteComboSlotUseCase {
  constructor(
    @Inject(COMBO_SLOT_REPOSITORY) private readonly repo: ComboSlotRepository,
  ) {}

  async execute(command: DeleteComboSlotCommand): Promise<Result<void, ApplicationError>> {
    const context = await this.repo.resolveComboProductContext(command.restaurantId, command.productId);
    if (context.status === 'not_found') {
      return err(restaurantProductNotFound(command.productId));
    }
    if (context.status === 'not_combo') {
      return err(invalidComboSlotConfiguration('El producto indicado no es de tipo combo.'));
    }

    const deleted = await this.repo.delete(context.context.comboDefinitionId, command.slotId);
    if (!deleted) {
      return err(comboSlotNotFound(command.slotId));
    }
    return ok(undefined);
  }
}
