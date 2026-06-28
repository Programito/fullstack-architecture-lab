import { Inject, Injectable } from '@nestjs/common';

import {
  invalidServiceWindows,
  restaurantNotFound,
  type ApplicationError,
} from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { ServiceWindow, UpdateServiceWindowInput } from '../../domain/restaurant-read.models';
import {
  RESTAURANT_SERVICE_WINDOWS_REPOSITORY,
  type RestaurantServiceWindowsRepository,
} from '../ports/restaurant-service-windows-repository.port';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_WINDOWS = 5;

type UpdateServiceWindowsCommand = {
  restaurantId: string;
  windows: UpdateServiceWindowInput[];
};

@Injectable()
export class UpdateRestaurantServiceWindowsUseCase {
  constructor(
    @Inject(RESTAURANT_SERVICE_WINDOWS_REPOSITORY)
    private readonly repository: RestaurantServiceWindowsRepository,
  ) {}

  async execute(command: UpdateServiceWindowsCommand): Promise<Result<ServiceWindow[], ApplicationError>> {
    if (command.windows.length === 0) {
      return err(invalidServiceWindows('at_least_one_window_required'));
    }

    if (command.windows.length > MAX_WINDOWS) {
      return err(invalidServiceWindows('too_many_windows'));
    }

    for (const w of command.windows) {
      if (w.name.trim().length === 0) {
        return err(invalidServiceWindows('empty_name'));
      }

      if (!TIME_RE.test(w.startTime) || !TIME_RE.test(w.endTime)) {
        return err(invalidServiceWindows('invalid_time_format'));
      }

      if (toMinutes(w.startTime) >= toMinutes(w.endTime)) {
        return err(invalidServiceWindows('start_must_be_before_end'));
      }
    }

    const updated = await this.repository.updateServiceWindows(command.restaurantId, command.windows);
    return updated ? ok(updated) : err(restaurantNotFound(command.restaurantId));
  }
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
