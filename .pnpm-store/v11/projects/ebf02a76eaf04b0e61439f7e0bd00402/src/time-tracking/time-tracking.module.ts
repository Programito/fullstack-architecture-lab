import { Module } from '@nestjs/common';

import { IdentityModule } from '../identity/identity.module';
import { ObservabilityModule } from '../observability/observability.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { TIME_TRACKING_REPOSITORY } from './application/ports/time-tracking-repository.port';
import { ClockInUseCase } from './application/use-cases/clock-in.use-case';
import { ClockOutUseCase } from './application/use-cases/clock-out.use-case';
import { CreateTimeEntryChangeRequestUseCase } from './application/use-cases/create-time-entry-change-request.use-case';
import { ListTimeEntriesUseCase } from './application/use-cases/list-time-entries.use-case';
import { ListTimeEntryChangeRequestsUseCase } from './application/use-cases/list-time-entry-change-requests.use-case';
import { ReviewTimeEntryChangeRequestUseCase } from './application/use-cases/review-time-entry-change-request.use-case';
import { PrismaTimeTrackingRepository } from './infrastructure/persistence/prisma-time-tracking.repository';
import { TimeTrackingController } from './presentation/rest/time-tracking.controller';

@Module({
  imports: [IdentityModule, ObservabilityModule, RestaurantsModule],
  controllers: [TimeTrackingController],
  providers: [
    ClockInUseCase,
    ClockOutUseCase,
    CreateTimeEntryChangeRequestUseCase,
    ListTimeEntriesUseCase,
    ListTimeEntryChangeRequestsUseCase,
    ReviewTimeEntryChangeRequestUseCase,
    PrismaTimeTrackingRepository,
    {
      provide: TIME_TRACKING_REPOSITORY,
      useExisting: PrismaTimeTrackingRepository,
    },
  ],
})
export class TimeTrackingModule {}
