import { Inject, Injectable } from '@nestjs/common';

import { restaurantNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { ServiceFloorView } from '../../domain/service-floor.models';
import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../ports/restaurant-read-repository.port';

@Injectable()
export class GetRestaurantServiceFloorUseCase {
  constructor(@Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository) {}

  async execute(restaurantId: string): Promise<Result<ServiceFloorView, ApplicationError>> {
    const serviceFloor = await this.restaurants.findServiceFloorByRestaurantId(restaurantId);
    return serviceFloor ? ok(serviceFloor) : err(restaurantNotFound(restaurantId));
  }
}
