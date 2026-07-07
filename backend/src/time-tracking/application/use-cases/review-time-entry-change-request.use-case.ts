import { Inject, Injectable } from '@nestjs/common';

import {
  forbiddenTimeEntryAccess,
  timeEntryChangeRequestAlreadyReviewed,
  timeEntryChangeRequestNotFound,
  type ApplicationError,
} from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { TimeEntryChangeRequestView } from '../../domain/time-tracking.models';
import { TIME_TRACKING_REPOSITORY, type TimeTrackingRepository } from '../ports/time-tracking-repository.port';
import { canReviewTeamEntries } from './list-time-entries.use-case';

@Injectable()
export class ReviewTimeEntryChangeRequestUseCase {
  constructor(@Inject(TIME_TRACKING_REPOSITORY) private readonly repository: TimeTrackingRepository) {}

  async execute(input: {
    requestId: string;
    reviewerUserId: string;
    reviewerRoles: string[];
    restaurantId: string;
    status: 'approved' | 'rejected';
    reviewNote: string | null;
    reviewedAt: string;
  }): Promise<Result<TimeEntryChangeRequestView, ApplicationError>> {
    if (!canReviewTeamEntries(input.reviewerRoles)) {
      return err(forbiddenTimeEntryAccess('Only admin or manager can review time entry change requests.'));
    }

    const request = await this.repository.findTimeEntryChangeRequestById(input.requestId);
    if (!request) {
      return err(timeEntryChangeRequestNotFound(input.requestId));
    }

    if (request.restaurantId !== input.restaurantId) {
      return err(forbiddenTimeEntryAccess('The change request does not belong to the active restaurant.', { requestId: input.requestId }));
    }

    if (request.status !== 'pending') {
      return err(timeEntryChangeRequestAlreadyReviewed(input.requestId));
    }

    return ok(
      await this.repository.reviewTimeEntryChangeRequest({
        requestId: input.requestId,
        reviewerUserId: input.reviewerUserId,
        status: input.status,
        reviewNote: input.reviewNote,
        reviewedAt: input.reviewedAt,
      }),
    );
  }
}
