import { Inject, Injectable } from '@nestjs/common';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { comboSlotNotFound, invalidComboSlotConfiguration, restaurantProductNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { NameI18n } from '../../domain/restaurant-read.models';
import { COMBO_SLOT_REPOSITORY, type ComboSlotEntity, type ComboSlotRepository } from '../ports/combo-slot-repository.port';
import type { CreateComboSlotOptionCommand } from './create-combo-slot.use-case';

export type UpdateComboSlotCommand = {
  restaurantId: string;
  productId: string;
  slotId: string;
  name?: string;
  nameI18n?: NameI18n;
  minSelections?: number;
  maxSelections?: number;
  isRequired?: boolean;
  options?: CreateComboSlotOptionCommand[];
};

@Injectable()
export class UpdateComboSlotUseCase {
  constructor(
    @Inject(COMBO_SLOT_REPOSITORY) private readonly repo: ComboSlotRepository,
  ) {}

  async execute(command: UpdateComboSlotCommand): Promise<Result<ComboSlotEntity, ApplicationError>> {
    const context = await this.repo.resolveComboProductContext(command.restaurantId, command.productId);
    if (context.status === 'not_found') {
      return err(restaurantProductNotFound(command.productId));
    }
    if (context.status === 'not_combo') {
      return err(invalidComboSlotConfiguration('El producto indicado no es de tipo combo.'));
    }

    const existing = await this.repo.findById(context.context.comboDefinitionId, command.slotId);
    if (!existing) {
      return err(comboSlotNotFound(command.slotId));
    }

    const minSelections = command.minSelections ?? existing.minSelections;
    const maxSelections = command.maxSelections ?? existing.maxSelections;
    if (minSelections > maxSelections) {
      return err(invalidComboSlotConfiguration('minSelections no puede ser mayor que maxSelections.'));
    }

    if (command.options !== undefined) {
      if (command.options.length === 0) {
        return err(invalidComboSlotConfiguration('El hueco de combo necesita al menos una opcion.'));
      }
      const uniqueProductIds = new Set(command.options.map((opt) => opt.restaurantProductId));
      if (uniqueProductIds.size !== command.options.length) {
        return err(invalidComboSlotConfiguration('No se puede repetir el mismo producto en las opciones del hueco.'));
      }
      const defaultCount = command.options.filter((opt) => opt.isDefault).length;
      if (defaultCount > 1) {
        return err(invalidComboSlotConfiguration('Solo una opcion puede marcarse como opcion por defecto.'));
      }
      const productsValid = await this.repo.areRestaurantProductsValid(command.restaurantId, [...uniqueProductIds]);
      if (!productsValid) {
        return err(invalidComboSlotConfiguration('Alguno de los productos indicados no pertenece a este restaurante.'));
      }
    }

    try {
      const slot = await this.repo.update(context.context.comboDefinitionId, command.slotId, {
        name: command.name,
        nameI18n: command.nameI18n,
        minSelections: command.minSelections,
        maxSelections: command.maxSelections,
        isRequired: command.isRequired,
        options: command.options,
      });
      if (!slot) {
        return err(comboSlotNotFound(command.slotId));
      }
      return ok(slot);
    } catch (error) {
      if (error instanceof ApplicationErrorException) return err(error.applicationError);
      throw error;
    }
  }
}
