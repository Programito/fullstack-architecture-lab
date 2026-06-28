import { Inject, Injectable } from '@nestjs/common';

import { restaurantNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { RestaurantReservation } from '../../domain/restaurant-read.models';
import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../ports/restaurant-read-repository.port';

@Injectable()
export class ListRestaurantReservationsUseCase {
  constructor(
    @Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository,
  ) {}

  async execute(restaurantId: string, date?: string): Promise<Result<RestaurantReservation[], ApplicationError>> {
    const reservations = await this.restaurants.listReservationsByRestaurantId(restaurantId, date);
    return reservations ? ok(reservations) : err(restaurantNotFound(restaurantId));
  }
}
