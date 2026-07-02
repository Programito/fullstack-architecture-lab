import { Module } from '@nestjs/common';

import { DatabaseReadinessService } from './database-readiness.service';
import { HealthController } from './health.controller';
import { SeedController } from './seed.controller';

@Module({
  providers: [DatabaseReadinessService],
  controllers: [HealthController, SeedController],
})
export class HealthModule {}
