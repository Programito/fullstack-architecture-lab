import { Inject, Injectable } from '@nestjs/common';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { invalidPlatterComponentConfiguration, platterComponentNotFound, restaurantProductNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { NameI18n } from '../../domain/restaurant-read.models';
import { PLATTER_COMPONENT_REPOSITORY, type PlatterComponentEntity, type PlatterComponentRepository } from '../ports/platter-component-repository.port';

export type UpdatePlatterComponentCommand = {
  restaurantId: string;
  productId: string;
  componentId: string;
  name?: string;
  nameI18n?: NameI18n;
  componentProductId?: string | null;
  quantity?: number | null;
  isRemovable?: boolean;
  isReplaceable?: boolean;
};

@Injectable()
export class UpdatePlatterComponentUseCase {
  constructor(
    @Inject(PLATTER_COMPONENT_REPOSITORY) private readonly repo: PlatterComponentRepository,
  ) {}

  async execute(command: UpdatePlatterComponentCommand): Promise<Result<PlatterComponentEntity, ApplicationError>> {
    if (command.quantity !== undefined && command.quantity !== null && command.quantity < 1) {
      return err(invalidPlatterComponentConfiguration('quantity debe ser al menos 1.'));
    }

    const context = await this.repo.resolvePlatterProductContext(command.restaurantId, command.productId);
    if (context.status === 'not_found') {
      return err(restaurantProductNotFound(command.productId));
    }
    if (context.status === 'not_platter') {
      return err(invalidPlatterComponentConfiguration('El producto indicado no es de tipo platter.'));
    }

    const existing = await this.repo.findById(context.context.platterDefinitionId, command.componentId);
    if (!existing) {
      return err(platterComponentNotFound(command.componentId));
    }

    if (command.componentProductId) {
      const productValid = await this.repo.isComponentProductValid(context.context.organizationId, command.componentProductId);
      if (!productValid) {
        return err(invalidPlatterComponentConfiguration('El producto asociado no pertenece a esta organizacion.'));
      }
    }

    try {
      const component = await this.repo.update(context.context.platterDefinitionId, command.componentId, {
        name: command.name,
        nameI18n: command.nameI18n,
        componentProductId: command.componentProductId,
        quantity: command.quantity,
        isRemovable: command.isRemovable,
        isReplaceable: command.isReplaceable,
      });
      if (!component) {
        return err(platterComponentNotFound(command.componentId));
      }
      return ok(component);
    } catch (error) {
      if (error instanceof ApplicationErrorException) return err(error.applicationError);
      throw error;
    }
  }
}
