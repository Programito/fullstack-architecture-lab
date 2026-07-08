import type { LogCategory, LogLevel, LogSource, Prisma } from '@prisma/client';

export type AppLogInput = {
  timestamp?: Date;
  source: LogSource;
  category: LogCategory;
  level: LogLevel;
  event: string;
  message: string;
  requestId?: string | null;
  organizationId?: string | null;
  userId?: string | null;
  restaurantId?: string | null;
  method?: string | null;
  path?: string | null;
  statusCode?: number | null;
  durationMs?: number | null;
  metadata?: Prisma.InputJsonValue | null;
};

export type LogQuery = {
  from: Date;
  to: Date;
  level?: LogLevel;
  category?: LogCategory;
  clientOrigin?: string;
  path?: string;
  userId?: string;
  actorUserId?: string;
  restaurantId?: string;
  entityType?: string;
  entityId?: string;
  result?: 'attempted' | 'succeeded' | 'failed';
  search?: string;
  restrictToUserIds?: string[];
  page: number;
  pageSize: number;
};

export type LogSummary = {
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  auditEvents: number;
  p95DurationMs: number;
  authByOrigin: Array<{
    key: string;
    succeeded: number;
    failed: number;
  }>;
  topSlowPaths: Array<{
    path: string;
    clientOrigin: string;
    p95DurationMs: number;
    total: number;
  }>;
  topErrorEvents: Array<{
    event: string;
    path: string | null;
    clientOrigin: string;
    count: number;
  }>;
  comparison: LogSummaryComparison;
};

export type LogErrorTrendPoint = {
  bucket: string;
  path: string;
  count: number;
};

export type LogComparisonMetric = {
  absolute: number;
  percent: number | null;
  direction: 'up' | 'down' | 'flat';
};

export type LogSummaryComparison = {
  previous: {
    totalRequests: number;
    errorCount: number;
    errorRate: number;
    auditEvents: number;
    p95DurationMs: number;
  };
  delta: {
    totalRequests: LogComparisonMetric;
    errorCount: LogComparisonMetric;
    errorRate: LogComparisonMetric;
    auditEvents: LogComparisonMetric;
    p95DurationMs: LogComparisonMetric;
  };
};
