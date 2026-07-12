import { Inject, Injectable } from '@nestjs/common';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { invalidComboSlotConfiguration, restaurantProductNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { NameI18n } from '../../domain/restaurant-read.models';
import { COMBO_SLOT_REPOSITORY, type ComboSlotEntity, type ComboSlotRepository } from '../ports/combo-slot-repository.port';

export type CreateComboSlotOptionCommand = {
  restaurantProductId: string;
  supplementPriceCents: number;
  isDefault?: boolean;
};

export type CreateComboSlotCommand = {
  restaurantId: string;
  productId: string;
  name: string;
  nameI18n?: NameI18n;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: CreateComboSlotOptionCommand[];
};

@Injectable()
export class CreateComboSlotUseCase {
  constructor(
    @Inject(COMBO_SLOT_REPOSITORY) private readonly repo: ComboSlotRepository,
  ) {}

  async execute(command: CreateComboSlotCommand): Promise<Result<ComboSlotEntity, ApplicationError>> {
    if (command.minSelections > command.maxSelections) {
      return err(invalidComboSlotConfiguration('minSelections no puede ser mayor que maxSelections.'));
    }
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

    const context = await this.repo.resolveComboProductContext(command.restaurantId, command.productId);
    if (context.status === 'not_found') {
      return err(restaurantProductNotFound(command.productId));
    }
    if (context.status === 'not_combo') {
      return err(invalidComboSlotConfiguration('El producto indicado no es de tipo combo.'));
    }

    const productsValid = await this.repo.areRestaurantProductsValid(command.restaurantId, [...uniqueProductIds]);
    if (!productsValid) {
      return err(invalidComboSlotConfiguration('Alguno de los productos indicados no pertenece a este restaurante.'));
    }

    try {
      const slot = await this.repo.create(context.context.comboDefinitionId, {
        name: command.name,
        nameI18n: command.nameI18n,
        minSelections: command.minSelections,
        maxSelections: command.maxSelections,
        isRequired: command.isRequired,
        options: command.options,
      });
      return ok(slot);
    } catch (error) {
      if (error instanceof ApplicationErrorException) return err(error.applicationError);
      throw error;
    }
  }
}
