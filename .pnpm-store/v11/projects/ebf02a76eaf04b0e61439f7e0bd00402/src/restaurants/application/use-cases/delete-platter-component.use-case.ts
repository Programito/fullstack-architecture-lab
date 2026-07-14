import { Inject, Injectable } from '@nestjs/common';

import { invalidPlatterComponentConfiguration, platterComponentNotFound, restaurantProductNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import { PLATTER_COMPONENT_REPOSITORY, type PlatterComponentRepository } from '../ports/platter-component-repository.port';

export type DeletePlatterComponentCommand = {
  restaurantId: string;
  productId: string;
  componentId: string;
};

@Injectable()
export class DeletePlatterComponentUseCase {
  constructor(
    @Inject(PLATTER_COMPONENT_REPOSITORY) private readonly repo: PlatterComponentRepository,
  ) {}

  async execute(command: DeletePlatterComponentCommand): Promise<Result<void, ApplicationError>> {
    const context = await this.repo.resolvePlatterProductContext(command.restaurantId, command.productId);
    if (context.status === 'not_found') {
      return err(restaurantProductNotFound(command.productId));
    }
    if (context.status === 'not_platter') {
      return err(invalidPlatterComponentConfiguration('El producto indicado no es de tipo platter.'));
    }

    const deleted = await this.repo.delete(context.context.platterDefinitionId, command.componentId);
    if (!deleted) {
      return err(platterComponentNotFound(command.componentId));
    }
    return ok(undefined);
  }
}
