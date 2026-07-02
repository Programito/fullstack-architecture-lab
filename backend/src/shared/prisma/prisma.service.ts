import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
    } catch {
      // Best effort shutdown: tests and app teardown should not fail because a DB connection was never established.
    }
  }
}
