import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { IdentityModule } from '../identity/identity.module';
import { AuditService } from './application/audit.service';
import { ObservabilityRetentionService } from './application/observability-retention.service';
import { ObservabilityRetentionRunner } from './application/observability-retention.runner';
import { ObservabilityService } from './application/observability.service';
import { DbColdStartObserver } from './infrastructure/db/db-cold-start-observer';
import { ExceptionLoggingFilter } from './infrastructure/http/exception-logging.filter';
import { RequestLoggingInterceptor } from './infrastructure/http/request-logging.interceptor';
import { ClientLogsController } from './presentation/rest/client-logs.controller';
import { DeveloperLogsController } from './presentation/rest/developer-logs.controller';

@Global()
@Module({
  imports: [IdentityModule],
  controllers: [DeveloperLogsController, ClientLogsController],
  providers: [
    ObservabilityRetentionService,
    ObservabilityRetentionRunner,
    ObservabilityService,
    DbColdStartObserver,
    AuditService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: ExceptionLoggingFilter,
    },
  ],
  exports: [AuditService, ObservabilityService],
})
export class ObservabilityModule {}
