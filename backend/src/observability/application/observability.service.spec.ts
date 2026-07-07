import { LogCategory } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

import { PrismaService } from '../../shared/prisma/prisma.service';
import { ObservabilityRetentionService } from './observability-retention.service';
import { ObservabilityService } from './observability.service';

describe('ObservabilityService', () => {
  // The service logs via Logger.error() on the raw-query failure paths exercised
  // below; silence it here so those expected failures don't spam test output.
  let loggerErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    loggerErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  const buildService = () => {
    const prisma = {
      appLog: {
        create: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
        deleteMany: vi.fn(),
        groupBy: vi.fn(),
      },
      $queryRaw: vi.fn(),
    } as unknown as PrismaService;

    const retention = new ObservabilityRetentionService(new ConfigService({
      LOG_RETENTION_DAYS: '30',
      AUDIT_RETENTION_DAYS: '60',
    }));

    return {
      prisma,
      service: new ObservabilityService(prisma, retention),
    };
  };

  it('computes summary metrics from stored logs', async () => {
    const { prisma, service } = buildService();
    vi.mocked(prisma.appLog.count)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(4);
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { key: 'web-admin', succeeded: 3n, failed: 1n },
      { key: 'apk-customer', succeeded: 2n, failed: 0n },
    ] as never).mockResolvedValueOnce([
      { event: 'http.request.failed', path: '/api/v1/orders/:id/payments', clientOrigin: 'web-pos', count: 3n },
      { event: 'frontend.http.error', path: '/api/v1/auth/login', clientOrigin: 'web-admin', count: 2n },
    ] as never);
    vi.mocked(prisma.appLog.findMany).mockResolvedValueOnce([
      { durationMs: 50, path: '/api/v1/auth/login', metadata: { clientOrigin: 'web-admin' } },
      { durationMs: 100, path: '/api/v1/auth/login', metadata: { clientOrigin: 'web-admin' } },
      { durationMs: 150, path: '/api/v1/restaurants/demo/orders/order-1/payments', metadata: { clientOrigin: 'web-pos' } },
      { durationMs: 200, path: '/api/v1/restaurants/demo/orders/order-2/payments', metadata: { clientOrigin: 'web-pos' } },
    ] as never);

    const summary = await service.getSummary(new Date('2026-07-01T00:00:00.000Z'), new Date('2026-07-02T00:00:00.000Z'));

    expect(summary).toEqual({
      totalRequests: 10,
      errorCount: 2,
      errorRate: 20,
      auditEvents: 4,
      p95DurationMs: 200,
      authByOrigin: [
        { key: 'web-admin', succeeded: 3, failed: 1 },
        { key: 'apk-customer', succeeded: 2, failed: 0 },
      ],
      topSlowPaths: [
        { path: '/api/v1/restaurants/:id/orders/:id/payments', clientOrigin: 'web-pos', p95DurationMs: 200, total: 2 },
        { path: '/api/v1/auth/login', clientOrigin: 'web-admin', p95DurationMs: 100, total: 2 },
      ],
      topErrorEvents: [
        { event: 'http.request.failed', path: '/api/v1/orders/:id/payments', clientOrigin: 'web-pos', count: 3 },
        { event: 'frontend.http.error', path: '/api/v1/auth/login', clientOrigin: 'web-admin', count: 2 },
      ],
    });
  });

  it('counts only request errors in the request error rate', async () => {
    const { prisma, service } = buildService();
    vi.mocked(prisma.appLog.count)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([] as never).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.appLog.findMany).mockResolvedValueOnce([
      { durationMs: 90 },
    ] as never);

    const summary = await service.getSummary(new Date('2026-07-01T00:00:00.000Z'), new Date('2026-07-02T00:00:00.000Z'));

    expect(summary.errorRate).toBe(10);
    expect(prisma.appLog.count).toHaveBeenNthCalledWith(2, {
      where: {
        timestamp: { gte: new Date('2026-07-01T00:00:00.000Z'), lte: new Date('2026-07-02T00:00:00.000Z') },
        category: LogCategory.request,
        level: 'error',
      },
    });
  });

  it('ignores stray from/to strings leaking in from the query DTO filters object', async () => {
    const { prisma, service } = buildService();
    vi.mocked(prisma.appLog.count)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([] as never).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.appLog.findMany).mockResolvedValueOnce([
      { durationMs: 90 },
    ] as never);

    // The REST controller passes the raw query DTO as `filters`, which still
    // carries its own string `from`/`to` fields even though the Pick<> type
    // says it shouldn't. Those must never win over the resolved Date range.
    const dtoLikeFilters = {
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-02T00:00:00.000Z',
      path: '/api/v1/orders',
    } as unknown as { path: string };

    await service.getSummary(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-02T00:00:00.000Z'),
      dtoLikeFilters,
    );

    expect(prisma.appLog.count).toHaveBeenNthCalledWith(1, {
      where: expect.objectContaining({
        timestamp: { gte: new Date('2026-07-01T00:00:00.000Z'), lte: new Date('2026-07-02T00:00:00.000Z') },
      }),
    });
  });

  it('restricts results to a set of user ids (plus anonymous rows) when restrictToUserIds is set', async () => {
    const { prisma, service } = buildService();
    vi.mocked(prisma.appLog.count)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([] as never).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.appLog.findMany).mockResolvedValueOnce([] as never);

    await service.getSummary(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-02T00:00:00.000Z'),
      { restrictToUserIds: ['demo-user-1', 'demo-user-2'] },
    );

    expect(prisma.appLog.count).toHaveBeenNthCalledWith(1, {
      where: expect.objectContaining({
        AND: [{ OR: [{ userId: null }, { userId: { in: ['demo-user-1', 'demo-user-2'] } }] }],
      }),
    });
  });

  it('does not let an explicit actorUserId filter bypass restrictToUserIds', async () => {
    const { prisma, service } = buildService();
    vi.mocked(prisma.appLog.count)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([] as never).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.appLog.findMany).mockResolvedValueOnce([] as never);

    await service.getSummary(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-02T00:00:00.000Z'),
      { actorUserId: 'real-user-99', restrictToUserIds: ['demo-user-1'] },
    );

    expect(prisma.appLog.count).toHaveBeenNthCalledWith(1, {
      where: expect.objectContaining({
        userId: 'real-user-99',
        AND: [{ OR: [{ userId: null }, { userId: { in: ['demo-user-1'] } }] }],
      }),
    });
  });

  it('applies path filters consistently across developer dashboard queries', async () => {
    const { prisma, service } = buildService();
    vi.mocked(prisma.appLog.count)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([] as never).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.appLog.findMany).mockResolvedValueOnce([
      { durationMs: 90 },
    ] as never);

    await service.getSummary(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-02T00:00:00.000Z'),
      { path: '/api/v1/orders' },
    );

    expect(prisma.appLog.count).toHaveBeenNthCalledWith(1, {
      where: {
        timestamp: { gte: new Date('2026-07-01T00:00:00.000Z'), lte: new Date('2026-07-02T00:00:00.000Z') },
        category: LogCategory.request,
        path: { contains: '/api/v1/orders', mode: 'insensitive' },
        userId: undefined,
        level: undefined,
        AND: undefined,
        OR: undefined,
      },
    });
  });

  it('applies the restaurant filter consistently across developer dashboard queries', async () => {
    const { prisma, service } = buildService();
    vi.mocked(prisma.appLog.count)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([] as never).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.appLog.findMany).mockResolvedValueOnce([
      { durationMs: 90 },
    ] as never);

    await service.getSummary(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-02T00:00:00.000Z'),
      { restaurantId: 'restaurant-mesaflow-centro' },
    );

    expect(prisma.appLog.count).toHaveBeenNthCalledWith(1, {
      where: {
        timestamp: { gte: new Date('2026-07-01T00:00:00.000Z'), lte: new Date('2026-07-02T00:00:00.000Z') },
        category: LogCategory.request,
        restaurantId: 'restaurant-mesaflow-centro',
        userId: undefined,
        level: undefined,
        AND: undefined,
        OR: undefined,
      },
    });
  });

  it('aggregates the timeline into hourly buckets via a raw SQL query', async () => {
    const { prisma, service } = buildService();
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { bucket: new Date('2026-07-01T10:00:00.000Z'), total: 5n, errors: 2n, audit: 1n },
      { bucket: new Date('2026-07-01T11:00:00.000Z'), total: 3n, errors: 0n, audit: 0n },
    ] as never);

    const timeline = await service.getTimeline(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-02T00:00:00.000Z'),
    );

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(timeline).toEqual([
      { bucket: '2026-07-01T10:00', total: 5, errors: 2, audit: 1 },
      { bucket: '2026-07-01T11:00', total: 3, errors: 0, audit: 0 },
    ]);
  });

  it('returns an empty timeline when the raw query fails', async () => {
    const { prisma, service } = buildService();
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('connection lost'));

    const timeline = await service.getTimeline(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-02T00:00:00.000Z'),
    );

    expect(timeline).toEqual([]);
    expect(loggerErrorSpy).toHaveBeenCalledWith('Failed to compute log timeline.', expect.any(String));
  });

  it('lists distinct entity options for a given entity type via raw SQL', async () => {
    const { prisma, service } = buildService();
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { id: 'prod-1', label: 'Burger especial' },
      { id: 'prod-2', label: null },
    ] as never);

    const options = await service.listEntityOptions('product', 'restaurant-mesaflow-centro');

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(options).toEqual([
      { id: 'prod-1', label: 'Burger especial' },
      { id: 'prod-2', label: 'prod-2' },
    ]);
  });

  it('lists distinct actor options derived from auth audit events via raw SQL', async () => {
    const { prisma, service } = buildService();
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { id: 'user-1', label: 'admin@example.com' },
      { id: 'user-2', label: null },
    ] as never);

    const options = await service.listActorOptions(['user-1', 'user-2']);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(options).toEqual([
      { id: 'user-1', label: 'admin@example.com' },
      { id: 'user-2', label: 'user-2' },
    ]);
  });

  it('returns empty actor options when the raw query fails', async () => {
    const { prisma, service } = buildService();
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('connection lost'));

    const options = await service.listActorOptions();

    expect(options).toEqual([]);
    expect(loggerErrorSpy).toHaveBeenCalledWith('Failed to list actor options.', expect.any(String));
  });

  it('returns empty entity options when the raw query fails', async () => {
    const { prisma, service } = buildService();
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('connection lost'));

    const options = await service.listEntityOptions('product');

    expect(options).toEqual([]);
    expect(loggerErrorSpy).toHaveBeenCalledWith('Failed to list entity options.', expect.any(String));
  });

  it('aggregates the breakdown by level and category via groupBy', async () => {
    const { prisma, service } = buildService();
    vi.mocked(prisma.appLog.groupBy)
      .mockResolvedValueOnce([
        { level: 'info', _count: { _all: 7 } },
        { level: 'error', _count: { _all: 2 } },
      ] as never)
      .mockResolvedValueOnce([
        { category: 'request', _count: { _all: 6 } },
        { category: 'audit', _count: { _all: 3 } },
      ] as never);

    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { key: 'web-admin', count: 5n },
      { key: 'apk-customer', count: 4n },
    ] as never);

    const breakdown = await service.getBreakdown(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-02T00:00:00.000Z'),
    );

    expect(prisma.appLog.groupBy).toHaveBeenNthCalledWith(1, expect.objectContaining({
      by: ['level'],
      _count: { _all: true },
    }));
    expect(prisma.appLog.groupBy).toHaveBeenNthCalledWith(2, expect.objectContaining({
      by: ['category'],
      _count: { _all: true },
    }));
    expect(breakdown).toEqual({
      levels: [
        { key: 'info', count: 7 },
        { key: 'error', count: 2 },
      ],
      categories: [
        { key: 'request', count: 6 },
        { key: 'audit', count: 3 },
      ],
      origins: [
        { key: 'web-admin', count: 5 },
        { key: 'apk-customer', count: 4 },
      ],
    });
  });

  it('filters developer dashboard queries by clientOrigin and exposes it in listed events', async () => {
    const { prisma, service } = buildService();
    vi.mocked(prisma.appLog.count)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { key: 'web-admin', succeeded: 1n, failed: 0n },
    ] as never).mockResolvedValueOnce([
      { event: 'auth.login.failed', path: '/api/v1/auth/login', clientOrigin: 'web-admin', count: 1n },
    ] as never);
    vi.mocked(prisma.appLog.findMany)
      .mockResolvedValueOnce([{ durationMs: 80, path: '/api/v1/auth/login', metadata: { clientOrigin: 'web-admin' } }] as never)
      .mockResolvedValueOnce([
        {
          id: 'log-1',
          timestamp: new Date('2026-07-01T10:00:00.000Z'),
          source: 'frontend',
          category: 'client',
          level: 'info',
          event: 'frontend.navigation',
          message: 'Navigation to /login',
          path: '/login',
          method: null,
          statusCode: null,
          durationMs: null,
          userId: 'user-1',
          restaurantId: null,
          requestId: 'req-1',
          metadata: {
            clientOrigin: 'web-admin',
          },
        },
      ] as never);

    await service.getSummary(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-02T00:00:00.000Z'),
      { clientOrigin: 'web-admin' },
    );

    const events = await service.listEvents({
      from: new Date('2026-07-01T00:00:00.000Z'),
      to: new Date('2026-07-02T00:00:00.000Z'),
      page: 1,
      pageSize: 20,
      clientOrigin: 'web-admin',
    });

    expect(prisma.appLog.count).toHaveBeenNthCalledWith(1, {
      where: expect.objectContaining({
        AND: [{ metadata: { path: ['clientOrigin'], equals: 'web-admin' } }],
      }),
    });
    expect(events.items[0]).toEqual(expect.objectContaining({
      clientOrigin: 'web-admin',
    }));
  });

  it('applies audit result and entity filters to developer dashboard queries', async () => {
    const { prisma, service } = buildService();
    vi.mocked(prisma.appLog.count)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { key: 'web-admin', succeeded: 1n, failed: 0n },
    ] as never).mockResolvedValueOnce([
      { event: 'restaurant.product.updated', path: '/api/v1/restaurants/demo/products/prod-1', clientOrigin: 'web-admin', count: 1n },
    ] as never);
    vi.mocked(prisma.appLog.findMany)
      .mockResolvedValueOnce([{ durationMs: 80, path: '/api/v1/restaurants/demo/products/prod-1', metadata: { clientOrigin: 'web-admin' } }] as never)
      .mockResolvedValueOnce([
        {
          id: 'log-1',
          timestamp: new Date('2026-07-01T10:00:00.000Z'),
          source: 'backend',
          category: 'audit',
          level: 'info',
          event: 'restaurant.product.updated',
          message: 'Product updated.',
          path: '/api/v1/restaurants/demo/products/prod-1',
          method: 'PATCH',
          statusCode: 200,
          durationMs: null,
          userId: 'user-1',
          restaurantId: 'restaurant-1',
          requestId: 'req-1',
          metadata: {
            actorRoles: ['manager'],
            result: 'succeeded',
            entityType: 'product',
            entityId: 'prod-1',
            entityLabel: 'Burger',
            changedFields: ['price'],
          },
        },
      ] as never);
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { bucket: new Date('2026-07-01T10:00:00.000Z'), total: 1n, errors: 0n, audit: 1n },
    ] as never);
    vi.mocked(prisma.appLog.groupBy)
      .mockResolvedValueOnce([{ level: 'info', _count: { _all: 1 } }] as never)
      .mockResolvedValueOnce([{ category: 'audit', _count: { _all: 1 } }] as never);

    const filters = {
      category: LogCategory.audit,
      path: '/api/v1/restaurants/demo/products',
      actorUserId: 'user-1',
      entityType: 'product',
      entityId: 'prod-1',
      result: 'succeeded' as const,
      search: 'Burger',
    };

    await service.getSummary(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-02T00:00:00.000Z'),
      filters,
    );
    await service.getTimeline(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-02T00:00:00.000Z'),
      filters,
    );
    await service.getBreakdown(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-02T00:00:00.000Z'),
      filters,
    );
    const events = await service.listEvents({
      from: new Date('2026-07-01T00:00:00.000Z'),
      to: new Date('2026-07-02T00:00:00.000Z'),
      page: 1,
      pageSize: 20,
      ...filters,
    });

    expect(prisma.appLog.count).toHaveBeenNthCalledWith(1, {
      where: {
        timestamp: { gte: new Date('2026-07-01T00:00:00.000Z'), lte: new Date('2026-07-02T00:00:00.000Z') },
        category: LogCategory.request,
        level: undefined,
        path: { contains: '/api/v1/restaurants/demo/products', mode: 'insensitive' },
        userId: 'user-1',
        AND: [
          { metadata: { path: ['entityType'], equals: 'product' } },
          { metadata: { path: ['entityId'], equals: 'prod-1' } },
          { metadata: { path: ['result'], equals: 'succeeded' } },
        ],
        OR: [
          { event: { contains: 'Burger', mode: 'insensitive' } },
          { message: { contains: 'Burger', mode: 'insensitive' } },
          { path: { contains: 'Burger', mode: 'insensitive' } },
          { metadata: { path: ['entityLabel'], string_contains: 'Burger' } },
        ],
      },
    });
    expect(prisma.appLog.count).toHaveBeenNthCalledWith(4, {
      where: {
        timestamp: { gte: new Date('2026-07-01T00:00:00.000Z'), lte: new Date('2026-07-02T00:00:00.000Z') },
        category: LogCategory.audit,
        level: undefined,
        path: { contains: '/api/v1/restaurants/demo/products', mode: 'insensitive' },
        userId: 'user-1',
        AND: [
          { metadata: { path: ['entityType'], equals: 'product' } },
          { metadata: { path: ['entityId'], equals: 'prod-1' } },
          { metadata: { path: ['result'], equals: 'succeeded' } },
        ],
        OR: [
          { event: { contains: 'Burger', mode: 'insensitive' } },
          { message: { contains: 'Burger', mode: 'insensitive' } },
          { path: { contains: 'Burger', mode: 'insensitive' } },
          { metadata: { path: ['entityLabel'], string_contains: 'Burger' } },
        ],
      },
    });
    expect(events.items[0]).toEqual(expect.objectContaining({
      actorRoles: ['manager'],
      result: 'succeeded',
      entityType: 'product',
      entityId: 'prod-1',
      entityLabel: 'Burger',
      changedFields: ['price'],
    }));
  });

  it('normalizes event category and level and strips blocked metadata keys', async () => {
    const { prisma, service } = buildService();
    vi.mocked(prisma.appLog.create).mockResolvedValue({} as never);

    await service.record({
      source: 'backend',
      category: 'request',
      level: 'error',
      event: 'frontend.network.offline',
      message: 'Browser connection lost.',
      organizationId: 'org-demo',
      metadata: {
        statusCode: 500,
        errorName: 'InternalServerErrorException',
        password: 'secret-should-not-survive',
      },
    });

    expect(prisma.appLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        category: 'client',
        level: 'warn',
        organizationId: 'org-demo',
        metadata: {
          statusCode: 500,
          errorName: 'InternalServerErrorException',
        },
      }),
    });
  });

  it('returns auth login success and failure counters grouped by client origin', async () => {
    const { prisma, service } = buildService();
    vi.mocked(prisma.appLog.count)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(4);
    vi.mocked(prisma.appLog.findMany).mockResolvedValueOnce([
      { durationMs: 40 },
      { durationMs: 80 },
    ] as never);
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      { key: 'web-admin', succeeded: 2n, failed: 1n },
      { key: 'web-demo', succeeded: 3n, failed: 0n },
      { key: null, succeeded: 1n, failed: 1n },
    ] as never).mockResolvedValueOnce([] as never);

    const summary = await service.getSummary(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-02T00:00:00.000Z'),
      { clientOrigin: 'web-admin' },
    );

    expect(summary.authByOrigin).toEqual([
      { key: 'web-admin', succeeded: 2, failed: 1 },
      { key: 'web-demo', succeeded: 3, failed: 0 },
    ]);
  });

  it('normalizes the category of a failed request but keeps its computed severity level', async () => {
    const { prisma, service } = buildService();
    vi.mocked(prisma.appLog.create).mockResolvedValue({} as never);

    await service.record({
      source: 'backend',
      category: 'request',
      level: 'warn',
      event: 'http.request.failed',
      message: 'GET /api/v1/auth/login completed with 401',
    });

    expect(prisma.appLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        category: 'request',
        level: 'warn',
      }),
    });
  });

  it('purges audit and non-audit logs with different retention windows', async () => {
    const { prisma, service } = buildService();

    await service.purgeExpired(new Date('2026-07-31T00:00:00.000Z'));

    expect(prisma.appLog.deleteMany).toHaveBeenNthCalledWith(1, {
      where: {
        category: { not: LogCategory.audit },
        timestamp: { lt: new Date('2026-07-01T00:00:00.000Z') },
      },
    });
    expect(prisma.appLog.deleteMany).toHaveBeenNthCalledWith(2, {
      where: {
        category: LogCategory.audit,
        timestamp: { lt: new Date('2026-06-01T00:00:00.000Z') },
      },
    });
  });
});
