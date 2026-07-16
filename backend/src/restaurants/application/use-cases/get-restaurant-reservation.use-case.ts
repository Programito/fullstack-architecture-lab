import { Inject, Injectable } from '@nestjs/common';

import { reservationNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { RestaurantReservation } from '../../domain/restaurant-read.models';
import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../ports/restaurant-read-repository.port';

@Injectable()
export class GetRestaurantReservationUseCase {
  constructor(
    @Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository,
  ) {}

  async execute(restaurantId: string, reservationId: string): Promise<Result<RestaurantReservation, ApplicationError>> {
    const reservation = await this.restaurants.findReservationById(restaurantId, reservationId);
    if (!reservation) {
      return err(reservationNotFound(reservationId));
    }
    return ok(reservation);
  }
}
