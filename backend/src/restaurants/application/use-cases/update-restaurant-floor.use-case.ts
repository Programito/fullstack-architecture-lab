import { Inject, Injectable } from '@nestjs/common';

import {
  floorNotFound,
  invalidFloorLayout,
  restaurantNotFound,
  type ApplicationError,
} from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { RestaurantFloors } from '../../domain/restaurant-read.models';
import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../ports/restaurant-read-repository.port';

export type UpdateRestaurantFloorCommand = {
  restaurantId: string;
  floorId: string;
  name: string;
  rows: number;
  columns: number;
};

@Injectable()
export class UpdateRestaurantFloorUseCase {
  constructor(
    @Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository,
  ) {}

  async execute(command: UpdateRestaurantFloorCommand): Promise<Result<RestaurantFloors, ApplicationError>> {
    const existingFloors = await this.restaurants.findFloorsByRestaurantId(command.restaurantId);
    if (!existingFloors) {
      return err(restaurantNotFound(command.restaurantId));
    }

    const floor = existingFloors.floors.find((candidate) => candidate.id === command.floorId);
    if (!floor) {
      return err(floorNotFound(command.floorId));
    }

    if (!command.name.trim() || command.rows < 1 || command.columns < 1) {
      return err(
        invalidFloorLayout({
          floorId: command.floorId,
          rows: command.rows,
          columns: command.columns,
        }),
      );
    }

    const updated = await this.restaurants.updateFloor(command.restaurantId, command.floorId, {
      name: command.name.trim(),
      rows: command.rows,
      columns: command.columns,
    });

    return updated ? ok(updated) : err(floorNotFound(command.floorId));
  }
}
