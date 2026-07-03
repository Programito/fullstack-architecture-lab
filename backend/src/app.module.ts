import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { HealthModule } from './health/health.module';
import { IdentityModule } from './identity/identity.module';
import { ObservabilityModule } from './observability/observability.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { PrismaModule } from './shared/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    IdentityModule,
    ObservabilityModule,
    OrganizationsModule,
    RestaurantsModule,
  ],
})
export class AppModule {}
