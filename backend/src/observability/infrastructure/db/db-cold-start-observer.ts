import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type LogCategory, type LogLevel } from '@prisma/client';

import { ObservabilityService } from '../../application/observability.service';
import { PrismaService } from '../../../shared/prisma/prisma.service';

const COLD_START_THRESHOLD_MS = 1500;
const SLOW_QUERY_THRESHOLD_MS = 1200;
const RECOVERY_WINDOW_MS = 60_000;

type PrismaMiddlewareParams = {
  model?: string;
  action: string;
};

type PrismaMiddleware = (
  params: PrismaMiddlewareParams,
  next: (params: PrismaMiddlewareParams) => Promise<unknown>,
) => Promise<unknown>;

@Injectable()
export class DbColdStartObserver implements OnModuleInit {
  private readonly enabled: boolean;
  private middlewareAttached = false;
  private firstObservedQuery = false;
  private lastTimeoutAt: number | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly observability: ObservabilityService,
    config: ConfigService,
  ) {
    this.enabled = config.get<string>('OBSERVABILITY_DB_COLD_START_ENABLED') === 'true';
  }

  onModuleInit(): void {
    if (!this.enabled || this.middlewareAttached) return;

    const prismaWithMiddleware = this.prisma as PrismaService & { $use?: (middleware: PrismaMiddleware) => void };
    if (typeof prismaWithMiddleware.$use !== 'function') {
      return;
    }

    prismaWithMiddleware.$use(async (params, next) => {
      if (params.model === 'AppLog') {
        return next(params);
      }

      const startedAt = Date.now();
      try {
        const result = await next(params);
        const durationMs = Date.now() - startedAt;
        await this.handleSuccess(params, durationMs);
        return result;
      } catch (error) {
        const durationMs = Date.now() - startedAt;
        await this.handleError(params, durationMs, error);
        throw error;
      }
    });

    this.middlewareAttached = true;
  }

  private async handleSuccess(params: PrismaMiddlewareParams, durationMs: number): Promise<void> {
    const operation = formatOperation(params);

    if (!this.firstObservedQuery) {
      this.firstObservedQuery = true;
      if (durationMs >= COLD_START_THRESHOLD_MS) {
        await this.record('db.connection.cold_start', 'warn', {
          operation,
          durationMs,
          coldStart: true,
          recovered: true,
          retryCount: 0,
        });
      }
    }

    if (durationMs >= SLOW_QUERY_THRESHOLD_MS) {
      await this.record('db.query.slow', 'warn', {
        operation,
        durationMs,
        coldStart: false,
        recovered: true,
        retryCount: 0,
      });
    }

    if (this.lastTimeoutAt && Date.now() - this.lastTimeoutAt <= RECOVERY_WINDOW_MS) {
      await this.record('db.connection.recovered', 'info', {
        operation,
        durationMs,
        coldStart: false,
        recovered: true,
        retryCount: 1,
      });
      this.lastTimeoutAt = null;
    }
  }

  private async handleError(params: PrismaMiddlewareParams, durationMs: number, error: unknown): Promise<void> {
    this.firstObservedQuery = true;

    if (!looksLikeTimeout(error, durationMs)) {
      return;
    }

    this.lastTimeoutAt = Date.now();
    await this.record('db.connection.timeout', 'error', {
      operation: formatOperation(params),
      durationMs,
      coldStart: durationMs >= COLD_START_THRESHOLD_MS,
      recovered: false,
      retryCount: 0,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
  }

  private async record(
    event: string,
    level: LogLevel,
    metadata: Prisma.InputJsonObject,
    category: LogCategory = 'error',
  ): Promise<void> {
    await this.observability.record({
      source: 'backend',
      category,
      level,
      event,
      message: buildMessage(event, metadata),
      metadata: {
        provider: 'postgres-free-tier',
        ...metadata,
      },
    });
  }
}

function formatOperation(params: PrismaMiddlewareParams): string {
  return params.model ? `${params.model}.${params.action}` : params.action;
}

function looksLikeTimeout(error: unknown, durationMs: number): boolean {
  if (durationMs >= COLD_START_THRESHOLD_MS) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('timed out')
    || message.includes('timeout')
    || message.includes('cannot reach database server')
    || message.includes('connection')
  );
}

function buildMessage(event: string, metadata: Prisma.InputJsonObject): string {
  const operation = typeof metadata['operation'] === 'string' ? metadata['operation'] : 'database.operation';
  const durationMs = typeof metadata['durationMs'] === 'number' ? metadata['durationMs'] : 0;

  switch (event) {
    case 'db.connection.cold_start':
      return `Database cold start detected during ${operation} (${durationMs} ms).`;
    case 'db.query.slow':
      return `Slow database query detected during ${operation} (${durationMs} ms).`;
    case 'db.connection.timeout':
      return `Database timeout detected during ${operation} (${durationMs} ms).`;
    case 'db.connection.recovered':
      return `Database recovered after timeout during ${operation} (${durationMs} ms).`;
    default:
      return `Database observability event detected during ${operation} (${durationMs} ms).`;
  }
}
