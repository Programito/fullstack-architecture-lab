import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { HealthModule } from './health/health.module';
import { IdentityModule } from './identity/identity.module';
import { TasksModule } from './tasks/tasks.module';
import { PrismaModule } from './shared/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    IdentityModule,
    TasksModule,
  ],
})
export class AppModule {}
