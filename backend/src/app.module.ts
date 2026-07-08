import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { HealthModule } from './health/health.module';
import { IdentityModule } from './identity/identity.module';
import { ObservabilityModule } from './observability/observability.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { TimeTrackingModule } from './time-tracking/time-tracking.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    HealthModule,
    IdentityModule,
    ObservabilityModule,
    OrganizationsModule,
    RealtimeModule.register({ enabled: process.env.REALTIME_ENABLED === 'true' }),
    RestaurantsModule,
    TimeTrackingModule,
  ],
})
export class AppModule {}
