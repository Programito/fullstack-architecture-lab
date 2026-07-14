import { Inject, Injectable } from '@nestjs/common';

import {
  forbiddenTimeEntryAccess,
  timeEntryNotFound,
  timeEntryNotOpen,
  type ApplicationError,
} from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { TimeEntry } from '../../domain/time-tracking.models';
import { TIME_TRACKING_REPOSITORY, type TimeTrackingRepository } from '../ports/time-tracking-repository.port';

@Injectable()
export class ClockOutUseCase {
  constructor(@Inject(TIME_TRACKING_REPOSITORY) private readonly repository: TimeTrackingRepository) {}

  async execute(input: {
    timeEntryId: string;
    userId: string;
    clockOutAt: string;
    clockOutNote: string | null;
  }): Promise<Result<TimeEntry, ApplicationError>> {
    const entry = await this.repository.findTimeEntryById(input.timeEntryId);
    if (!entry) {
      return err(timeEntryNotFound(input.timeEntryId));
    }

    if (entry.entry.userId !== input.userId) {
      return err(forbiddenTimeEntryAccess('Only the owner can close this time entry.', { timeEntryId: input.timeEntryId }));
    }

    if (entry.entry.status !== 'open') {
      return err(timeEntryNotOpen(input.timeEntryId));
    }

    return ok(
      await this.repository.closeTimeEntry({
        timeEntryId: input.timeEntryId,
        clockOutAt: input.clockOutAt,
        clockOutNote: input.clockOutNote,
      }),
    );
  }
}
