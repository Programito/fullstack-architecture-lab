import { Inject, Injectable } from '@nestjs/common';

import {
  floorNotFound,
  invalidFloorElementLayout,
  restaurantNotFound,
  type ApplicationError,
} from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import { hasOverlappingFloorElements } from '../../domain/floor-layout.validation';
import type { RestaurantFloors, FloorElementView } from '../../domain/restaurant-read.models';
import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../ports/restaurant-read-repository.port';

export type CreateFloorElementCommand = {
  restaurantId: string;
  floorId: string;
  type: FloorElementView['type'];
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tableId: string | null;
  shape: FloorElementView['shape'];
  sortOrder: number;
};

@Injectable()
export class CreateFloorElementUseCase {
  constructor(
    @Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository,
  ) {}

  async execute(command: CreateFloorElementCommand): Promise<Result<RestaurantFloors, ApplicationError>> {
    const existingFloors = await this.restaurants.findFloorsByRestaurantId(command.restaurantId);
    if (!existingFloors) {
      return err(restaurantNotFound(command.restaurantId));
    }

    const floor = existingFloors.floors.find((candidate) => candidate.id === command.floorId);
    if (!floor) {
      return err(floorNotFound(command.floorId));
    }

    if (
      !command.label.trim() ||
      command.x < 0 ||
      command.y < 0 ||
      command.width < 1 ||
      command.height < 1 ||
      command.sortOrder < 1
    ) {
      return err(invalidFloorElementLayout({ floorId: command.floorId, label: command.label }));
    }

    if (command.x + command.width - 1 > floor.columns || command.y + command.height > floor.rows) {
      return err(invalidFloorElementLayout({ floorId: command.floorId, label: command.label }));
    }

    if (
      hasOverlappingFloorElements([
        ...floor.elements,
        {
          id: command.label.trim(),
          x: command.x,
          y: command.y,
          width: command.width,
          height: command.height,
        },
      ])
    ) {
      return err(invalidFloorElementLayout({ floorId: command.floorId, label: command.label }));
    }

    const updated = await this.restaurants.createFloorElement(command.restaurantId, command.floorId, {
      type: command.type,
      label: command.label.trim(),
      x: command.x,
      y: command.y,
      width: command.width,
      height: command.height,
      tableId: command.tableId,
      shape: command.shape,
      sortOrder: command.sortOrder,
    });

    return updated ? ok(updated) : err(floorNotFound(command.floorId));
  }
}
