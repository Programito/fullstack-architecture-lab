import { Inject, Injectable } from '@nestjs/common';

import {
  invalidReservationCreation,
  restaurantNotFound,
  type ApplicationError,
} from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { err, ok, type Result } from '../../../shared/result/result';
import type { CreateRestaurantReservationInput, RestaurantReservation } from '../../domain/restaurant-read.models';
import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../ports/restaurant-read-repository.port';

type CreateRestaurantReservationCommand = {
  restaurantId: string;
} & CreateRestaurantReservationInput;

@Injectable()
export class CreateRestaurantReservationUseCase {
  constructor(
    @Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository,
  ) {}

  async execute(
    command: CreateRestaurantReservationCommand,
  ): Promise<Result<RestaurantReservation, ApplicationError>> {
    if (command.customerNameSnapshot.trim().length === 0) {
      return err(invalidReservationCreation({ reason: 'missing_customer_name' }));
    }

    if (command.partySize < 1) {
      return err(invalidReservationCreation({ reason: 'invalid_party_size' }));
    }

    if (command.durationMinutes < 15) {
      return err(invalidReservationCreation({ reason: 'invalid_duration' }));
    }

    if (Number.isNaN(new Date(command.reservationAt).getTime())) {
      return err(invalidReservationCreation({ reason: 'invalid_reservation_at' }));
    }

    try {
      const reservation = await this.restaurants.createReservation(command.restaurantId, {
        customerNameSnapshot: command.customerNameSnapshot.trim(),
        customerPhoneSnapshot: command.customerPhoneSnapshot?.trim() || null,
        partySize: command.partySize,
        reservationAt: command.reservationAt,
        durationMinutes: command.durationMinutes,
        notes: command.notes?.trim() || null,
        tableIds: command.tableIds,
      });

      return reservation ? ok(reservation) : err(restaurantNotFound(command.restaurantId));
    } catch (error) {
      if (error instanceof ApplicationErrorException) {
        return err(error.applicationError);
      }

      throw error;
    }
  }
}
