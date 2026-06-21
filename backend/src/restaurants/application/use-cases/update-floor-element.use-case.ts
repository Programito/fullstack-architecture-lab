import { Inject, Injectable } from '@nestjs/common';

import {
  floorNotFound,
  invalidFloorElementLayout,
  restaurantNotFound,
  type ApplicationError,
} from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { RestaurantFloors, FloorElementView } from '../../domain/restaurant-read.models';
import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../ports/restaurant-read-repository.port';

export type UpdateFloorElementCommand = {
  restaurantId: string;
  floorId: string;
  elementId: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: FloorElementView['shape'];
  capacity: number | null;
};

@Injectable()
export class UpdateFloorElementUseCase {
  constructor(
    @Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository,
  ) {}

  async execute(command: UpdateFloorElementCommand): Promise<Result<RestaurantFloors, ApplicationError>> {
    const existingFloors = await this.restaurants.findFloorsByRestaurantId(command.restaurantId);
    if (!existingFloors) {
      return err(restaurantNotFound(command.restaurantId));
    }

    const floor = existingFloors.floors.find((candidate) => candidate.id === command.floorId);
    if (!floor) {
      return err(floorNotFound(command.floorId));
    }

    const existingElement = floor.elements.find((candidate) => candidate.id === command.elementId);
    if (!existingElement) {
      return err(floorNotFound(command.floorId));
    }

    if (
      !command.label.trim() ||
      command.x < 0 ||
      command.y < 0 ||
      command.width < 1 ||
      command.height < 1 ||
      (command.capacity !== null && command.capacity < 1)
    ) {
      return err(invalidFloorElementLayout({ floorId: command.floorId, elementId: command.elementId }));
    }

    if (command.x + command.width > floor.columns || command.y + command.height > floor.rows) {
      return err(invalidFloorElementLayout({ floorId: command.floorId, elementId: command.elementId }));
    }

    const updated = await this.restaurants.updateFloorElement(command.restaurantId, command.floorId, command.elementId, {
      label: command.label.trim(),
      x: command.x,
      y: command.y,
      width: command.width,
      height: command.height,
      shape: command.shape ?? existingElement.shape,
      capacity: command.capacity,
    });

    return updated ? ok(updated) : err(floorNotFound(command.floorId));
  }
}
