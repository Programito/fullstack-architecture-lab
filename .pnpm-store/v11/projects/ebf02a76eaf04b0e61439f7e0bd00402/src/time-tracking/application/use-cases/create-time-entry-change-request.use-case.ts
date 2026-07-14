import { Inject, Injectable } from '@nestjs/common';

import { forbiddenTimeEntryAccess, timeEntryNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { TimeEntryChangeRequestView } from '../../domain/time-tracking.models';
import { TIME_TRACKING_REPOSITORY, type TimeTrackingRepository } from '../ports/time-tracking-repository.port';

@Injectable()
export class CreateTimeEntryChangeRequestUseCase {
  constructor(@Inject(TIME_TRACKING_REPOSITORY) private readonly repository: TimeTrackingRepository) {}

  async execute(input: {
    restaurantId: string;
    requesterUserId: string;
    timeEntryId: string;
    requestedClockInAt: string | null;
    requestedClockOutAt: string | null;
    requestedClockInNote: string | null;
    requestedClockOutNote: string | null;
    reason: string;
  }): Promise<Result<TimeEntryChangeRequestView, ApplicationError>> {
    const entry = await this.repository.findTimeEntryById(input.timeEntryId);
    if (!entry) {
      return err(timeEntryNotFound(input.timeEntryId));
    }

    if (entry.entry.userId !== input.requesterUserId || entry.entry.restaurantId !== input.restaurantId) {
      return err(forbiddenTimeEntryAccess('Only the owner can request changes for this time entry.', { timeEntryId: input.timeEntryId }));
    }

    return ok(
      await this.repository.createTimeEntryChangeRequest({
        timeEntryId: input.timeEntryId,
        restaurantId: input.restaurantId,
        requestedByUserId: input.requesterUserId,
        requestedClockInAt: input.requestedClockInAt,
        requestedClockOutAt: input.requestedClockOutAt,
        requestedClockInNote: input.requestedClockInNote,
        requestedClockOutNote: input.requestedClockOutNote,
        reason: input.reason,
      }),
    );
  }
}
