import { Inject, Injectable } from '@nestjs/common';

import { forbiddenTimeEntryAccess, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { TimeEntryChangeRequestView } from '../../domain/time-tracking.models';
import { TIME_TRACKING_REPOSITORY, type TimeTrackingRepository } from '../ports/time-tracking-repository.port';
import { canReviewTeamEntries } from './list-time-entries.use-case';

@Injectable()
export class ListTimeEntryChangeRequestsUseCase {
  constructor(@Inject(TIME_TRACKING_REPOSITORY) private readonly repository: TimeTrackingRepository) {}

  async execute(input: {
    restaurantId: string;
    requesterRoles: string[];
    status?: 'pending' | 'approved' | 'rejected';
  }): Promise<Result<TimeEntryChangeRequestView[], ApplicationError>> {
    if (!canReviewTeamEntries(input.requesterRoles)) {
      return err(forbiddenTimeEntryAccess('Only admin or manager can review time entry change requests.'));
    }

    return ok(
      await this.repository.listTimeEntryChangeRequests({
        restaurantId: input.restaurantId,
        status: input.status,
      }),
    );
  }
}
