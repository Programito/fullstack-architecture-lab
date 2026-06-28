import { Inject, Injectable } from '@nestjs/common';

import {
  reservationNotFound,
  restaurantNotFound,
  type ApplicationError,
} from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { err, ok, type Result } from '../../../shared/result/result';
import type { RestaurantReservation } from '../../domain/restaurant-read.models';
import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../ports/restaurant-read-repository.port';

type UpdateRestaurantReservationStatusCommand = {
  restaurantId: string;
  reservationId: string;
  status: RestaurantReservation['status'];
};

@Injectable()
export class UpdateRestaurantReservationStatusUseCase {
  constructor(
    @Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository,
  ) {}

  async execute(
    command: UpdateRestaurantReservationStatusCommand,
  ): Promise<Result<RestaurantReservation, ApplicationError>> {
    const reservations = await this.restaurants.listReservationsByRestaurantId(command.restaurantId);
    if (!reservations) {
      return err(restaurantNotFound(command.restaurantId));
    }

    if (!reservations.some((reservation) => reservation.id === command.reservationId)) {
      return err(reservationNotFound(command.reservationId));
    }

    try {
      const reservation = await this.restaurants.updateReservationStatus(
        command.restaurantId,
        command.reservationId,
        command.status,
      );
      return reservation ? ok(reservation) : err(reservationNotFound(command.reservationId));
    } catch (error) {
      if (error instanceof ApplicationErrorException) {
        return err(error.applicationError);
      }
      throw error;
    }
  }
}
