import { Injectable, Logger } from '@nestjs/common';
import { LogCategory, type LogLevel, Prisma } from '@prisma/client';

import { PrismaService } from '../../shared/prisma/prisma.service';
import { extractClientOrigin } from './client-origin';
import { OBSERVABILITY_EVENT_CATALOG } from './observability-event-catalog';
import { sanitizeMetadata } from './observability-metadata.policy';
import type { AppLogInput, LogErrorTrendPoint, LogQuery, LogSummary } from './observability.types';
import { ObservabilityRetentionService } from './observability-retention.service';

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly retention: ObservabilityRetentionService,
  ) {}

  async record(input: AppLogInput): Promise<void> {
    try {
      const normalized = normalizeInput(input);
      await this.prisma.appLog.create({
        data: {
          timestamp: normalized.timestamp ?? new Date(),
          source: normalized.source,
          category: normalized.category,
          level: normalized.level,
          event: normalized.event,
          message: normalized.message,
          requestId: normalized.requestId ?? null,
          organizationId: normalized.organizationId ?? null,
          userId: normalized.userId ?? null,
          restaurantId: normalized.restaurantId ?? null,
          method: normalized.method ?? null,
          path: normalized.path ?? null,
          statusCode: normalized.statusCode ?? null,
          durationMs: normalized.durationMs ?? null,
          metadata: sanitizeMetadata(normalized.category, normalized.metadata),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to persist log entry for event "${input.event}".`, error instanceof Error ? error.stack : error);
      return;
    }
  }

  async getSummary(
    from: Date,
    to: Date,
    filters: Partial<Pick<LogQuery, 'level' | 'category' | 'clientOrigin' | 'path' | 'userId' | 'actorUserId' | 'restaurantId' | 'entityType' | 'entityId' | 'result' | 'search' | 'restrictToUserIds'>> = {},
  ): Promise<LogSummary> {
    try {
      const where = buildWhere({ ...filters, from, to });
      const [requestCount, errorCount, auditEvents, requestDurations] = await Promise.all([
        this.prisma.appLog.count({ where: { ...where, category: LogCategory.request } }),
        this.prisma.appLog.count({ where: { ...where, category: LogCategory.request, level: 'error' } }),
        this.prisma.appLog.count({ where: { ...where, category: LogCategory.audit } }),
        this.prisma.appLog.findMany({
          where: { ...where, category: LogCategory.request, durationMs: { not: null } },
          select: { durationMs: true, path: true, metadata: true },
          orderBy: { durationMs: 'asc' },
        }),
      ]);
      const authByOriginRows = await this.prisma.$queryRaw<Array<{ key: string | null; succeeded: bigint; failed: bigint }>>(Prisma.sql`
        SELECT
          "metadata"->>'clientOrigin' AS key,
          COUNT(*) FILTER (WHERE "event" IN ('auth.login.succeeded', 'auth.demo-login.succeeded'))::bigint AS succeeded,
          COUNT(*) FILTER (WHERE "event" = 'auth.login.failed')::bigint AS failed
        FROM "app_logs"
        WHERE ${buildWhereSql({ ...filters, from, to })}
          AND "category" = 'audit'
          AND "metadata"->>'entityType' = 'auth'
          AND "event" IN ('auth.login.succeeded', 'auth.demo-login.succeeded', 'auth.login.failed')
        GROUP BY "metadata"->>'clientOrigin'
        ORDER BY succeeded DESC, failed DESC
      `);

      const topErrorRows = await this.prisma.$queryRaw<Array<{
        event: string;
        path: string | null;
        clientOrigin: string | null;
        count: bigint;
      }>>(Prisma.sql`
        SELECT
          "event",
          "path",
          "metadata"->>'clientOrigin' AS "clientOrigin",
          COUNT(*)::bigint AS count
        FROM "app_logs"
        WHERE ${buildWhereSql({ ...filters, from, to })}
          AND "level" = 'error'
        GROUP BY "event", "path", "metadata"->>'clientOrigin'
        ORDER BY count DESC
        LIMIT 5
      `);

      const durations = requestDurations.flatMap((entry) => entry.durationMs ?? []);
      const topSlowPaths = summarizeTopSlowPaths(requestDurations);
      return {
        totalRequests: requestCount,
        errorCount,
        errorRate: requestCount > 0 ? Number(((errorCount / requestCount) * 100).toFixed(1)) : 0,
        auditEvents,
        p95DurationMs: percentile(durations, 0.95),
        authByOrigin: authByOriginRows
          .filter((row) => typeof row.key === 'string' && row.key.length > 0)
          .map((row) => ({
            key: row.key as string,
            succeeded: Number(row.succeeded),
            failed: Number(row.failed),
          })),
        topSlowPaths,
        topErrorEvents: topErrorRows.map((row) => ({
          event: row.event,
          path: row.path ? normalizeObservedPath(row.path) : null,
          clientOrigin: row.clientOrigin ?? 'backend',
          count: Number(row.count),
        })),
      };
    } catch (error) {
      this.logger.error('Failed to compute log summary.', error instanceof Error ? error.stack : error);
      return {
        totalRequests: 0,
        errorCount: 0,
        errorRate: 0,
        auditEvents: 0,
        p95DurationMs: 0,
        authByOrigin: [],
        topSlowPaths: [],
        topErrorEvents: [],
      };
    }
  }

  async getTimeline(
    from: Date,
    to: Date,
    filters: Partial<Pick<LogQuery, 'level' | 'category' | 'clientOrigin' | 'path' | 'userId' | 'actorUserId' | 'restaurantId' | 'entityType' | 'entityId' | 'result' | 'search' | 'restrictToUserIds'>> = {},
  ): Promise<Array<{ bucket: string; total: number; errors: number; audit: number }>> {
    try {
      const whereSql = buildWhereSql({ ...filters, from, to });
      const rows = await this.prisma.$queryRaw<Array<{ bucket: Date; total: bigint; errors: bigint; audit: bigint }>>(Prisma.sql`
        SELECT
          date_trunc('hour', "timestamp") AS bucket,
          COUNT(*)::bigint AS total,
          COUNT(*) FILTER (WHERE "level" = 'error')::bigint AS errors,
          COUNT(*) FILTER (WHERE "category" = 'audit')::bigint AS audit
        FROM "app_logs"
        WHERE ${whereSql}
        GROUP BY bucket
        ORDER BY bucket ASC
      `);

      return rows.map((row) => ({
        bucket: `${row.bucket.toISOString().slice(0, 13)}:00`,
        total: Number(row.total),
        errors: Number(row.errors),
        audit: Number(row.audit),
      }));
    } catch (error) {
      this.logger.error('Failed to compute log timeline.', error instanceof Error ? error.stack : error);
      return [];
    }
  }

  async getBreakdown(
    from: Date,
    to: Date,
    filters: Partial<Pick<LogQuery, 'level' | 'category' | 'clientOrigin' | 'path' | 'userId' | 'actorUserId' | 'restaurantId' | 'entityType' | 'entityId' | 'result' | 'search' | 'restrictToUserIds'>> = {},
  ): Promise<{
    levels: Array<{ key: LogLevel; count: number }>;
    categories: Array<{ key: string; count: number }>;
    origins: Array<{ key: string; count: number }>;
  }> {
    try {
      const where = buildWhere({ ...filters, from, to });
      const whereSql = buildWhereSql({ ...filters, from, to });
      const [levelGroups, categoryGroups, originGroups] = await Promise.all([
        this.prisma.appLog.groupBy({ by: ['level'], where, _count: { _all: true } }),
        this.prisma.appLog.groupBy({ by: ['category'], where, _count: { _all: true } }),
        this.prisma.$queryRaw<Array<{ key: string | null; count: bigint }>>(Prisma.sql`
          SELECT
            "metadata"->>'clientOrigin' AS key,
            COUNT(*)::bigint AS count
          FROM "app_logs"
          WHERE ${whereSql}
          GROUP BY "metadata"->>'clientOrigin'
          ORDER BY count DESC
        `),
      ]);

      return {
        levels: levelGroups.map((group) => ({ key: group.level, count: group._count._all })),
        categories: categoryGroups.map((group) => ({ key: group.category, count: group._count._all })),
        origins: originGroups
          .filter((group) => typeof group.key === 'string' && group.key.length > 0)
          .map((group) => ({ key: group.key as string, count: Number(group.count) })),
      };
    } catch (error) {
      this.logger.error('Failed to compute log breakdown.', error instanceof Error ? error.stack : error);
      return { levels: [], categories: [], origins: [] };
    }
  }

  async getErrorTrendsByPath(
    from: Date,
    to: Date,
    filters: Partial<Pick<LogQuery, 'level' | 'category' | 'clientOrigin' | 'path' | 'userId' | 'actorUserId' | 'restaurantId' | 'entityType' | 'entityId' | 'result' | 'search' | 'restrictToUserIds'>> = {},
  ): Promise<LogErrorTrendPoint[]> {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ bucket: Date; path: string | null; count: bigint }>>(Prisma.sql`
        SELECT
          date_trunc('hour', "timestamp") AS bucket,
          "path",
          COUNT(*)::bigint AS count
        FROM "app_logs"
        WHERE ${buildWhereSql({ ...filters, from, to })}
          AND "level" = 'error'
          AND "path" IS NOT NULL
        GROUP BY bucket, "path"
        ORDER BY bucket ASC, count DESC
      `);

      return mergeErrorTrendRows(rows);
    } catch (error) {
      this.logger.error('Failed to compute error trends by path.', error instanceof Error ? error.stack : error);
      return [];
    }
  }

  async listEntityOptions(
    entityType: string,
    restaurantId?: string,
    restrictToUserIds?: string[],
  ): Promise<Array<{ id: string; label: string }>> {
    try {
      const conditions: Prisma.Sql[] = [
        Prisma.sql`"category" = 'audit'`,
        Prisma.sql`"metadata"->>'entityType' = ${entityType}`,
        Prisma.sql`"metadata"->>'entityId' IS NOT NULL`,
      ];
      if (restaurantId) conditions.push(Prisma.sql`"restaurantId" = ${restaurantId}`);
      if (restrictToUserIds) {
        conditions.push(Prisma.sql`("userId" IS NULL OR "userId" = ANY(${restrictToUserIds}::text[]))`);
      }

      const rows = await this.prisma.$queryRaw<Array<{ id: string; label: string | null }>>(Prisma.sql`
        SELECT DISTINCT
          "metadata"->>'entityId' AS id,
          "metadata"->>'entityLabel' AS label
        FROM "app_logs"
        WHERE ${Prisma.join(conditions, ' AND ')}
        ORDER BY id
        LIMIT 50
      `);

      return rows.map((row) => ({ id: row.id, label: row.label ?? row.id }));
    } catch (error) {
      this.logger.error('Failed to list entity options.', error instanceof Error ? error.stack : error);
      return [];
    }
  }

  async listActorOptions(restrictToUserIds?: string[]): Promise<Array<{ id: string; label: string }>> {
    try {
      const conditions: Prisma.Sql[] = [
        Prisma.sql`"category" = 'audit'`,
        Prisma.sql`"metadata"->>'entityType' = 'auth'`,
        Prisma.sql`"userId" IS NOT NULL`,
      ];
      if (restrictToUserIds) {
        conditions.push(Prisma.sql`"userId" = ANY(${restrictToUserIds}::text[])`);
      }

      const rows = await this.prisma.$queryRaw<Array<{ id: string; label: string | null }>>(Prisma.sql`
        SELECT DISTINCT ON ("userId")
          "userId" AS id,
          "metadata"->>'entityLabel' AS label
        FROM "app_logs"
        WHERE ${Prisma.join(conditions, ' AND ')}
        ORDER BY "userId", "timestamp" DESC
        LIMIT 50
      `);

      return rows.map((row) => ({ id: row.id, label: row.label ?? row.id }));
    } catch (error) {
      this.logger.error('Failed to list actor options.', error instanceof Error ? error.stack : error);
      return [];
    }
  }

  async listEvents(query: LogQuery): Promise<{
    total: number;
    items: Array<{
      id: string;
      timestamp: string;
      source: string;
      category: string;
      level: string;
      event: string;
      message: string;
      path: string | null;
      method: string | null;
      statusCode: number | null;
      durationMs: number | null;
      userId: string | null;
      restaurantId: string | null;
      requestId: string | null;
      actorRoles: string[];
      result: 'attempted' | 'succeeded' | 'failed' | null;
      clientOrigin: string;
      entityType: string | null;
      entityId: string | null;
      entityLabel: string | null;
      changedFields: string[];
      metadata: Prisma.JsonValue | null;
    }>;
  }> {
    const where = buildWhere(query);

    let total = 0;
    let items: Awaited<ReturnType<typeof this.prisma.appLog.findMany>> = [];
    try {
      [total, items] = await Promise.all([
        this.prisma.appLog.count({ where }),
        this.prisma.appLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
      ]);
    } catch (error) {
      this.logger.error('Failed to list log events.', error instanceof Error ? error.stack : error);
      return { total: 0, items: [] };
    }

    return {
      total,
      items: items.map((item) => ({
        ...extractAuditMetadata(item.metadata),
        id: item.id,
        timestamp: item.timestamp.toISOString(),
        source: item.source,
        clientOrigin: extractClientOrigin(item.metadata, item.source === 'frontend' ? 'web-admin' : 'backend'),
        category: item.category,
        level: item.level,
        event: item.event,
        message: item.message,
        path: item.path,
        method: item.method,
        statusCode: item.statusCode,
        durationMs: item.durationMs,
        userId: item.userId,
        restaurantId: item.restaurantId,
        requestId: item.requestId,
        metadata: item.metadata,
      })),
    };
  }

  async purgeExpired(reference = new Date()): Promise<void> {
    const logThreshold = new Date(reference.getTime() - this.retention.logRetentionDays * 24 * 60 * 60 * 1000);
    const auditThreshold = new Date(reference.getTime() - this.retention.auditRetentionDays * 24 * 60 * 60 * 1000);

    try {
      await Promise.all([
        this.prisma.appLog.deleteMany({
          where: {
            category: { not: LogCategory.audit },
            timestamp: { lt: logThreshold },
          },
        }),
        this.prisma.appLog.deleteMany({
          where: {
            category: LogCategory.audit,
            timestamp: { lt: auditThreshold },
          },
        }),
      ]);
    } catch (error) {
      this.logger.error('Failed to purge expired log entries.', error instanceof Error ? error.stack : error);
      return;
    }
  }
}

function normalizeInput(input: AppLogInput): AppLogInput {
  const catalogEntry = OBSERVABILITY_EVENT_CATALOG[input.event];
  if (!catalogEntry) {
    return input;
  }

  return {
    ...input,
    category: catalogEntry.category,
    level: catalogEntry.level ?? input.level,
  };
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) return 0;
  const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * ratio) - 1));
  return values[index] ?? 0;
}

function summarizeTopSlowPaths(rows: Array<{ durationMs: number | null; path: string | null; metadata: Prisma.JsonValue | null }>): Array<{
  path: string;
  clientOrigin: string;
  p95DurationMs: number;
  total: number;
}> {
  const groups = new Map<string, { path: string; clientOrigin: string; durations: number[] }>();

  for (const row of rows) {
    if (!row.path || row.durationMs == null) continue;
    const path = normalizeObservedPath(row.path);
    const clientOrigin = extractClientOrigin(row.metadata, 'backend');
    const key = `${path}::${clientOrigin}`;
    const current = groups.get(key) ?? { path, clientOrigin, durations: [] };
    current.durations.push(row.durationMs);
    groups.set(key, current);
  }

  return [...groups.values()]
    .map((group) => ({
      path: group.path,
      clientOrigin: group.clientOrigin,
      p95DurationMs: percentile(group.durations.sort((left, right) => left - right), 0.95),
      total: group.durations.length,
    }))
    .sort((left, right) => right.p95DurationMs - left.p95DurationMs || right.total - left.total)
    .slice(0, 5);
}

function mergeErrorTrendRows(rows: Array<{ bucket: Date; path: string | null; count: bigint }>): LogErrorTrendPoint[] {
  const merged = new Map<string, LogErrorTrendPoint>();

  for (const row of rows) {
    if (!row.path) continue;
    const bucket = `${row.bucket.toISOString().slice(0, 13)}:00`;
    const path = normalizeObservedPath(row.path);
    const key = `${bucket}::${path}`;
    const current = merged.get(key) ?? { bucket, path, count: 0 };
    current.count += Number(row.count);
    merged.set(key, current);
  }

  return [...merged.values()].sort((left, right) => left.bucket.localeCompare(right.bucket) || right.count - left.count || left.path.localeCompare(right.path));
}

function normalizeObservedPath(path: string): string {
  return path
    .replace(/\/restaurants\/[^/]+/gi, '/restaurants/:id')
    .replace(/\/orders\/[^/]+/gi, '/orders/:id')
    .replace(/\/products\/[^/]+/gi, '/products/:id')
    .replace(/\/reservations\/[^/]+/gi, '/reservations/:id')
    .replace(/\/customers\/[^/]+/gi, '/customers/:id')
    .replace(/\/sessions\/[^/]+/gi, '/sessions/:id')
    .replace(/\/users\/[^/]+/gi, '/users/:id')
    .replace(/\/roles\/[^/]+/gi, '/roles/:id')
    .replace(/\/permissions\/[^/]+/gi, '/permissions/:id')
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '/:id')
    .replace(/\/\d+(?=\/|$)/g, '/:id');
}

function extractAuditMetadata(metadata: Prisma.JsonValue | null): {
  actorRoles: string[];
  result: 'attempted' | 'succeeded' | 'failed' | null;
  entityType: string | null;
  entityId: string | null;
  entityLabel: string | null;
  changedFields: string[];
} {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {
      actorRoles: [],
      result: null,
      entityType: null,
      entityId: null,
      entityLabel: null,
      changedFields: [],
    };
  }

  const object = metadata as Record<string, unknown>;
  return {
    actorRoles: Array.isArray(object['actorRoles']) ? object['actorRoles'].filter((value): value is string => typeof value === 'string') : [],
    result: isAuditResult(object['result']) ? object['result'] : null,
    entityType: typeof object['entityType'] === 'string' ? object['entityType'] : null,
    entityId: typeof object['entityId'] === 'string' ? object['entityId'] : null,
    entityLabel: typeof object['entityLabel'] === 'string' ? object['entityLabel'] : null,
    changedFields: Array.isArray(object['changedFields']) ? object['changedFields'].filter((value): value is string => typeof value === 'string') : [],
  };
}

function isAuditResult(value: unknown): value is 'attempted' | 'succeeded' | 'failed' {
  return value === 'attempted' || value === 'succeeded' || value === 'failed';
}

function buildWhere(
  query: Pick<LogQuery, 'from' | 'to'> & Partial<Pick<LogQuery, 'level' | 'category' | 'clientOrigin' | 'path' | 'userId' | 'actorUserId' | 'restaurantId' | 'entityType' | 'entityId' | 'result' | 'search' | 'restrictToUserIds'>>,
): Prisma.AppLogWhereInput {
  const andFilters: Prisma.AppLogWhereInput[] = [];
  if (query.clientOrigin) {
    andFilters.push({ metadata: { path: ['clientOrigin'], equals: query.clientOrigin } });
  }
  if (query.entityType) {
    andFilters.push({ metadata: { path: ['entityType'], equals: query.entityType } });
  }
  if (query.entityId) {
    andFilters.push({ metadata: { path: ['entityId'], equals: query.entityId } });
  }
  if (query.result) {
    andFilters.push({ metadata: { path: ['result'], equals: query.result } });
  }
  if (query.restrictToUserIds) {
    andFilters.push({ OR: [{ userId: null }, { userId: { in: query.restrictToUserIds } }] });
  }

  return {
    timestamp: { gte: query.from, lte: query.to },
    level: query.level,
    category: query.category,
    path: query.path ? { contains: query.path, mode: 'insensitive' } : undefined,
    userId: query.actorUserId ?? query.userId,
    restaurantId: query.restaurantId,
    AND: andFilters.length > 0 ? andFilters : undefined,
    OR: query.search ? [
      { event: { contains: query.search, mode: 'insensitive' } },
      { message: { contains: query.search, mode: 'insensitive' } },
      { path: { contains: query.search, mode: 'insensitive' } },
      { metadata: { path: ['entityLabel'], string_contains: query.search } },
    ] : undefined,
  };
}

function buildWhereSql(
  query: Pick<LogQuery, 'from' | 'to'> & Partial<Pick<LogQuery, 'level' | 'category' | 'clientOrigin' | 'path' | 'userId' | 'actorUserId' | 'restaurantId' | 'entityType' | 'entityId' | 'result' | 'search' | 'restrictToUserIds'>>,
): Prisma.Sql {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`"timestamp" >= ${query.from}`,
    Prisma.sql`"timestamp" <= ${query.to}`,
  ];

  if (query.level) conditions.push(Prisma.sql`"level" = ${query.level}::"LogLevel"`);
  if (query.category) conditions.push(Prisma.sql`"category" = ${query.category}::"LogCategory"`);
  if (query.clientOrigin) conditions.push(Prisma.sql`"metadata"->>'clientOrigin' = ${query.clientOrigin}`);
  if (query.path) conditions.push(Prisma.sql`"path" ILIKE ${`%${query.path}%`}`);

  const userId = query.actorUserId ?? query.userId;
  if (userId) conditions.push(Prisma.sql`"userId" = ${userId}`);
  if (query.restaurantId) conditions.push(Prisma.sql`"restaurantId" = ${query.restaurantId}`);
  if (query.entityType) conditions.push(Prisma.sql`"metadata"->>'entityType' = ${query.entityType}`);
  if (query.entityId) conditions.push(Prisma.sql`"metadata"->>'entityId' = ${query.entityId}`);
  if (query.result) conditions.push(Prisma.sql`"metadata"->>'result' = ${query.result}`);
  if (query.restrictToUserIds) {
    conditions.push(Prisma.sql`("userId" IS NULL OR "userId" = ANY(${query.restrictToUserIds}::text[]))`);
  }
  if (query.search) {
    const term = `%${query.search}%`;
    conditions.push(Prisma.sql`(
      "event" ILIKE ${term}
      OR "message" ILIKE ${term}
      OR "path" ILIKE ${term}
      OR "metadata"->>'entityLabel' ILIKE ${term}
    )`);
  }

  return Prisma.join(conditions, ' AND ');
}
