import { Inject, Injectable } from '@nestjs/common';

import {
  insufficientTableCapacity,
  invalidReservationCreation,
  outsideServiceHours,
  reservationConflict,
  reservationInPast,
  restaurantNotFound,
  type ApplicationError,
} from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { err, ok, type Result } from '../../../shared/result/result';
import type { CreateRestaurantReservationInput, RestaurantReservation } from '../../domain/restaurant-read.models';
import { RESTAURANT_READ_REPOSITORY, type RestaurantReadRepository } from '../ports/restaurant-read-repository.port';
import {
  RESTAURANT_SERVICE_WINDOWS_REPOSITORY,
  type RestaurantServiceWindowsRepository,
} from '../ports/restaurant-service-windows-repository.port';

type CreateRestaurantReservationCommand = {
  restaurantId: string;
} & CreateRestaurantReservationInput;

@Injectable()
export class CreateRestaurantReservationUseCase {
  constructor(
    @Inject(RESTAURANT_READ_REPOSITORY) private readonly restaurants: RestaurantReadRepository,
    @Inject(RESTAURANT_SERVICE_WINDOWS_REPOSITORY) private readonly serviceWindows: RestaurantServiceWindowsRepository,
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

    const startTime = new Date(command.reservationAt);
    if (Number.isNaN(startTime.getTime())) {
      return err(invalidReservationCreation({ reason: 'invalid_reservation_at' }));
    }

    if (startTime <= new Date()) {
      return err(reservationInPast());
    }

    const endTime = new Date(startTime.getTime() + command.durationMinutes * 60 * 1000);

    for (const tableId of command.tableIds) {
      const capacity = await this.restaurants.findTableCapacity(command.restaurantId, tableId);
      if (capacity !== null && command.partySize > capacity) {
        return err(insufficientTableCapacity(tableId, command.partySize, capacity));
      }

      const conflicts = await this.restaurants.findConflictingReservations(
        command.restaurantId,
        tableId,
        startTime,
        endTime,
      );
      if (conflicts.length > 0) {
        return err(reservationConflict(tableId));
      }
    }

    const windows = await this.serviceWindows.findServiceWindowsByRestaurantId(command.restaurantId);
    if (windows !== null && windows.length > 0) {
      const startHHMM = toHHMM(startTime);
      const endHHMM = toHHMM(endTime);
      const fitsWindow = windows.some((w) => startHHMM >= w.startTime && endHHMM <= w.endTime);
      if (!fitsWindow) {
        return err(outsideServiceHours());
      }
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

function toHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
