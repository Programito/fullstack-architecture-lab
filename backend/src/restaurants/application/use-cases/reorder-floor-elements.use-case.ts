import { Inject, Injectable } from '@nestjs/common';

import {
  floorNotFound,
  invalidFloorElementLayout,
  restaurantNotFound,
  type ApplicationError,
} from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { RestaurantFloors } from '../../domain/restaurant-read.models';
import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../ports/restaurant-read-repository.port';

export type ReorderFloorElementsCommand = {
  restaurantId: string;
  floorId: string;
  elements: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    sortOrder: number;
  }>;
};

@Injectable()
export class ReorderFloorElementsUseCase {
  constructor(
    @Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository,
  ) {}

  async execute(command: ReorderFloorElementsCommand): Promise<Result<RestaurantFloors, ApplicationError>> {
    const existingFloors = await this.restaurants.findFloorsByRestaurantId(command.restaurantId);
    if (!existingFloors) {
      return err(restaurantNotFound(command.restaurantId));
    }

    const floor = existingFloors.floors.find((candidate) => candidate.id === command.floorId);
    if (!floor) {
      return err(floorNotFound(command.floorId));
    }

    for (const element of command.elements) {
      if (element.x < 0 || element.y < 0 || element.width < 1 || element.height < 1 || element.sortOrder < 1) {
        return err(invalidFloorElementLayout({ elementId: element.id }));
      }
      if (element.x + element.width - 1 > floor.columns || element.y + element.height > floor.rows) {
        return err(invalidFloorElementLayout({ elementId: element.id, floorId: floor.id }));
      }
    }

    const updated = await this.restaurants.reorderFloorElements(
      command.restaurantId,
      command.floorId,
      command.elements,
    );

    return updated ? ok(updated) : err(floorNotFound(command.floorId));
  }
}
