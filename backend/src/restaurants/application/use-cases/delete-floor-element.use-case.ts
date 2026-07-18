import { Inject, Injectable } from '@nestjs/common';

import {
  floorNotFound,
  restaurantNotFound,
  type ApplicationError,
} from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { RestaurantFloors } from '../../domain/restaurant-read.models';
import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../ports/restaurant-read-repository.port';

export type DeleteFloorElementCommand = {
  restaurantId: string;
  floorId: string;
  elementId: string;
};

@Injectable()
export class DeleteFloorElementUseCase {
  constructor(
    @Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository,
  ) {}

  async execute(command: DeleteFloorElementCommand): Promise<Result<RestaurantFloors, ApplicationError>> {
    const existingFloors = await this.restaurants.findFloorsByRestaurantId(command.restaurantId);
    if (!existingFloors) {
      return err(restaurantNotFound(command.restaurantId));
    }

    const floor = existingFloors.floors.find((candidate) => candidate.id === command.floorId);
    if (!floor || !floor.elements.some((candidate) => candidate.id === command.elementId)) {
      return err(floorNotFound(command.floorId));
    }

    const updated = await this.restaurants.deleteFloorElement(
      command.restaurantId,
      command.floorId,
      command.elementId,
    );

    return updated ? ok(updated) : err(floorNotFound(command.floorId));
  }
}
