import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { HealthModule } from './health/health.module';
import { IdentityModule } from './identity/identity.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // PrismaModule is temporarily disabled for local in-memory development.
    // Re-enable it when DATABASE_URL/PostgreSQL is available.
    // PrismaModule,
    HealthModule,
    IdentityModule,
    TasksModule,
  ],
})
export class AppModule {}
