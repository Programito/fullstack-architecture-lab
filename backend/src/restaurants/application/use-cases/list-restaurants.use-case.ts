import { Inject, Injectable } from '@nestjs/common';

import { ok, type Result } from '../../../shared/result/result';
import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../ports/restaurant-read-repository.port';
import type { RestaurantSummary } from '../../domain/restaurant-read.models';

@Injectable()
export class ListRestaurantsUseCase {
  constructor(
    @Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository,
  ) {}

  async execute(restaurantIds: string[]): Promise<Result<RestaurantSummary[], never>> {
    return ok(await this.restaurants.listRestaurants(restaurantIds));
  }
}
