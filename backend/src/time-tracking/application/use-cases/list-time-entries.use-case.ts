import { Inject, Injectable } from '@nestjs/common';

import { forbiddenTimeEntryAccess, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { TimeEntryView } from '../../domain/time-tracking.models';
import { TIME_TRACKING_REPOSITORY, type TimeTrackingRepository } from '../ports/time-tracking-repository.port';

@Injectable()
export class ListTimeEntriesUseCase {
  constructor(@Inject(TIME_TRACKING_REPOSITORY) private readonly repository: TimeTrackingRepository) {}

  async execute(input: {
    restaurantId: string;
    requesterUserId: string;
    requesterRoles: string[];
    scope: 'self' | 'team';
    dateFrom?: string;
    dateTo?: string;
    status?: 'open' | 'closed' | 'corrected';
    workerUserId?: string;
  }): Promise<Result<TimeEntryView[], ApplicationError>> {
    if (input.scope === 'team' && !canReviewTeamEntries(input.requesterRoles)) {
      return err(forbiddenTimeEntryAccess('Only admin or manager can view team entries.', { userId: input.requesterUserId }));
    }

    return ok(
      await this.repository.listTimeEntries({
        restaurantId: input.restaurantId,
        requesterUserId: input.requesterUserId,
        scope: input.scope,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        status: input.status,
        workerUserId: input.workerUserId,
      }),
    );
  }
}

export function canReviewTeamEntries(roles: string[]): boolean {
  return roles.includes('admin') || roles.includes('manager');
}
