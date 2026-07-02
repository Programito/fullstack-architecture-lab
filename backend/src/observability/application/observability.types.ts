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
};
