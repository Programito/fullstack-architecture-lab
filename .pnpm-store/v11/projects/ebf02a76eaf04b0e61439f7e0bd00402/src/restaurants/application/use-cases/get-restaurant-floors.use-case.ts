import { Inject, Injectable } from '@nestjs/common';

import { restaurantNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { RestaurantFloors } from '../../domain/restaurant-read.models';
import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../ports/restaurant-read-repository.port';

@Injectable()
export class GetRestaurantFloorsUseCase {
  constructor(
    @Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository,
  ) {}

  async execute(restaurantId: string): Promise<Result<RestaurantFloors, ApplicationError>> {
    const floors = await this.restaurants.findFloorsByRestaurantId(restaurantId);
    return floors ? ok(floors) : err(restaurantNotFound(restaurantId));
  }
}
