import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { SeedController } from './seed.controller';

@Module({
  controllers: [HealthController, SeedController],
})
export class HealthModule {}
