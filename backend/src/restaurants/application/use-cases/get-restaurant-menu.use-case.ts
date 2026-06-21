import { Inject, Injectable } from '@nestjs/common';

import { restaurantNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { RestaurantMenu } from '../../domain/restaurant-read.models';
import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../ports/restaurant-read-repository.port';

@Injectable()
export class GetRestaurantMenuUseCase {
  constructor(
    @Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository,
  ) {}

  async execute(restaurantId: string): Promise<Result<RestaurantMenu, ApplicationError>> {
    const menu = await this.restaurants.findMenuByRestaurantId(restaurantId);
    return menu ? ok(menu) : err(restaurantNotFound(restaurantId));
  }
}
