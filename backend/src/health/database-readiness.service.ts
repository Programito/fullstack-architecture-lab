import { Injectable } from '@nestjs/common';

import { PrismaService } from '../shared/prisma/prisma.service';

const READINESS_WARMUP_THRESHOLD_MS = 1_500;

export type ReadinessStatus = 'ready' | 'warming_up' | 'down';

export type DatabaseReadinessResult = {
  status: ReadinessStatus;
  database: ReadinessStatus;
  durationMs: number;
};

@Injectable()
export class DatabaseReadinessService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<DatabaseReadinessResult> {
    const startedAt = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const durationMs = Date.now() - startedAt;
      const status: ReadinessStatus = durationMs >= READINESS_WARMUP_THRESHOLD_MS ? 'warming_up' : 'ready';

      return {
        status,
        database: status,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const status = classifyDatabaseError(error, durationMs);

      return {
        status,
        database: status,
        durationMs,
      };
    }
  }
}

function classifyDatabaseError(error: unknown, durationMs: number): ReadinessStatus {
  if (durationMs >= READINESS_WARMUP_THRESHOLD_MS) {
    return 'warming_up';
  }

  if (!(error instanceof Error)) {
    return 'down';
  }

  const message = error.message.toLowerCase();
  if (
    message.includes('timed out')
    || message.includes('timeout')
    || message.includes('cannot reach database server')
    || message.includes('connection')
    || message.includes('server closed the connection')
  ) {
    return 'warming_up';
  }

  return 'down';
}
