import { Inject, Injectable } from '@nestjs/common';

import { timeEntryAlreadyOpen, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { TimeEntry } from '../../domain/time-tracking.models';
import { TIME_TRACKING_REPOSITORY, type TimeTrackingRepository } from '../ports/time-tracking-repository.port';

@Injectable()
export class ClockInUseCase {
  constructor(@Inject(TIME_TRACKING_REPOSITORY) private readonly repository: TimeTrackingRepository) {}

  async execute(input: {
    restaurantId: string;
    userId: string;
    clockInAt: string;
    clockInNote: string | null;
  }): Promise<Result<TimeEntry, ApplicationError>> {
    const openEntry = await this.repository.findOpenEntryForUser(input.restaurantId, input.userId);
    if (openEntry) {
      return err(timeEntryAlreadyOpen(input.userId, input.restaurantId));
    }

    return ok(
      await this.repository.createTimeEntry({
        userId: input.userId,
        restaurantId: input.restaurantId,
        clockInAt: input.clockInAt,
        clockInNote: input.clockInNote,
      }),
    );
  }
}
