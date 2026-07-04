/**
 * Integration spec for ObservabilityService.
 * Requires Docker (Testcontainers). Run with:
 * `pnpm test:integration -- observability.service.integration-spec.ts`
 */
import { execFileSync } from 'node:child_process';

import { ConfigService } from '@nestjs/config';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaService } from '../../shared/prisma/prisma.service';
import { ObservabilityRetentionService } from './observability-retention.service';
import { ObservabilityService } from './observability.service';

describe('ObservabilityService (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let service: ObservabilityService;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    process.env.DATABASE_URL = container.getConnectionUri();

    const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
    execFileSync(pnpm, ['prisma', 'migrate', 'deploy'], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'pipe',
      shell: true,
    });

    prisma = new PrismaService();
    await prisma.$connect();
    const retention = new ObservabilityRetentionService(new ConfigService({
      LOG_RETENTION_DAYS: '30',
      AUDIT_RETENTION_DAYS: '90',
    }));
    service = new ObservabilityService(prisma, retention);
  }, 120_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
  });

  beforeEach(async () => {
    await prisma.appLog.deleteMany();
  });

  it('groups the timeline into hourly buckets via raw SQL, honoring filters and ignoring stray from/to strings on the filters object', async () => {
    await prisma.appLog.createMany({
      data: [
        {
          timestamp: new Date('2026-01-10T10:05:00.000Z'),
          source: 'backend',
          category: 'request',
          level: 'info',
          event: 'http.request.completed',
          message: 'ok',
          restaurantId: 'restaurant-a',
        },
        {
          timestamp: new Date('2026-01-10T10:40:00.000Z'),
          source: 'backend',
          category: 'request',
          level: 'error',
          event: 'http.request.failed',
          message: 'boom',
          restaurantId: 'restaurant-a',
        },
        {
          // different restaurant, same hour: must be excluded by the restaurantId filter
          timestamp: new Date('2026-01-10T10:10:00.000Z'),
          source: 'backend',
          category: 'request',
          level: 'info',
          event: 'http.request.completed',
          message: 'ok',
          restaurantId: 'restaurant-b',
        },
        {
          // outside the queried range entirely
          timestamp: new Date('2026-01-09T10:10:00.000Z'),
          source: 'backend',
          category: 'request',
          level: 'info',
          event: 'http.request.completed',
          message: 'ok',
          restaurantId: 'restaurant-a',
        },
      ],
    });

    const from = new Date('2026-01-10T00:00:00.000Z');
    const to = new Date('2026-01-11T00:00:00.000Z');
    // Simulates the REST controller passing the raw query DTO as `filters`,
    // which still carries its own string `from`/`to` at runtime even though
    // the Pick<> type says it shouldn't. Regression coverage for a real bug:
    // the raw SQL query received `text` instead of `timestamp` and failed.
    const dtoLikeFilters = {
      from: '1999-01-01T00:00:00.000Z',
      to: '1999-01-02T00:00:00.000Z',
      restaurantId: 'restaurant-a',
    } as unknown as { restaurantId: string };

    const timeline = await service.getTimeline(from, to, dtoLikeFilters);

    expect(timeline).toEqual([
      { bucket: '2026-01-10T10:00', total: 2, errors: 1, audit: 0 },
    ]);
  });

  it('counts levels and categories via groupBy against real data', async () => {
    await prisma.appLog.createMany({
      data: [
        { timestamp: new Date('2026-01-10T10:00:00.000Z'), source: 'backend', category: 'request', level: 'info', event: 'http.request.completed', message: 'ok' },
        { timestamp: new Date('2026-01-10T10:05:00.000Z'), source: 'backend', category: 'request', level: 'error', event: 'http.request.failed', message: 'boom' },
        { timestamp: new Date('2026-01-10T10:10:00.000Z'), source: 'backend', category: 'audit', level: 'info', event: 'auth.login.succeeded', message: 'login' },
      ],
    });

    const breakdown = await service.getBreakdown(
      new Date('2026-01-10T00:00:00.000Z'),
      new Date('2026-01-11T00:00:00.000Z'),
    );

    expect(breakdown.levels).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'info', count: 2 }),
      expect.objectContaining({ key: 'error', count: 1 }),
    ]));
    expect(breakdown.categories).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'request', count: 2 }),
      expect.objectContaining({ key: 'audit', count: 1 }),
    ]));
  });

  it('filters events by entity metadata and free-text search using Postgres JSON operators', async () => {
    await prisma.appLog.createMany({
      data: [
        {
          timestamp: new Date('2026-01-10T10:00:00.000Z'),
          source: 'backend',
          category: 'audit',
          level: 'info',
          event: 'restaurant.product.updated',
          message: 'Product updated.',
          metadata: {
            actorRoles: ['manager'],
            result: 'succeeded',
            entityType: 'product',
            entityId: 'prod-1',
            entityLabel: 'Burger especial',
            changedFields: ['price'],
          },
        },
        {
          timestamp: new Date('2026-01-10T10:05:00.000Z'),
          source: 'backend',
          category: 'audit',
          level: 'info',
          event: 'restaurant.product.updated',
          message: 'Product updated.',
          metadata: {
            actorRoles: ['manager'],
            result: 'succeeded',
            entityType: 'product',
            entityId: 'prod-2',
            entityLabel: 'Ensalada',
            changedFields: ['name'],
          },
        },
      ],
    });

    const byEntity = await service.listEvents({
      from: new Date('2026-01-10T00:00:00.000Z'),
      to: new Date('2026-01-11T00:00:00.000Z'),
      entityType: 'product',
      entityId: 'prod-1',
      page: 1,
      pageSize: 20,
    });
    expect(byEntity.items).toHaveLength(1);
    expect(byEntity.items[0]).toMatchObject({ entityId: 'prod-1', entityLabel: 'Burger especial' });

    const bySearch = await service.listEvents({
      from: new Date('2026-01-10T00:00:00.000Z'),
      to: new Date('2026-01-11T00:00:00.000Z'),
      search: 'Ensalada',
      page: 1,
      pageSize: 20,
    });
    expect(bySearch.items).toHaveLength(1);
    expect(bySearch.items[0]).toMatchObject({ entityId: 'prod-2' });
  });

  it('lists distinct entity options for an entity type, restricted by restaurant', async () => {
    await prisma.appLog.createMany({
      data: [
        {
          timestamp: new Date('2026-01-10T10:00:00.000Z'),
          source: 'backend',
          category: 'audit',
          level: 'info',
          event: 'restaurant.product.updated',
          message: 'Product updated.',
          restaurantId: 'restaurant-a',
          metadata: { entityType: 'product', entityId: 'prod-1', entityLabel: 'Burger especial', result: 'succeeded' },
        },
        {
          timestamp: new Date('2026-01-10T10:05:00.000Z'),
          source: 'backend',
          category: 'audit',
          level: 'info',
          event: 'restaurant.product.updated',
          message: 'Product updated again.',
          restaurantId: 'restaurant-a',
          metadata: { entityType: 'product', entityId: 'prod-1', entityLabel: 'Burger especial', result: 'succeeded' },
        },
        {
          // different restaurant -> excluded when filtering by restaurant-a
          timestamp: new Date('2026-01-10T10:10:00.000Z'),
          source: 'backend',
          category: 'audit',
          level: 'info',
          event: 'restaurant.product.updated',
          message: 'Product updated.',
          restaurantId: 'restaurant-b',
          metadata: { entityType: 'product', entityId: 'prod-2', entityLabel: 'Ensalada', result: 'succeeded' },
        },
      ],
    });

    const options = await service.listEntityOptions('product', 'restaurant-a');

    expect(options).toEqual([{ id: 'prod-1', label: 'Burger especial' }]);
  });

  it('restricts entity options to the given user ids (plus anonymous rows)', async () => {
    await prisma.appLog.createMany({
      data: [
        {
          timestamp: new Date('2026-01-10T10:00:00.000Z'),
          source: 'backend',
          category: 'audit',
          level: 'info',
          event: 'restaurant.product.updated',
          message: 'Product updated.',
          userId: 'demo-user-1',
          metadata: { entityType: 'product', entityId: 'prod-demo', entityLabel: 'Demo product', result: 'succeeded' },
        },
        {
          timestamp: new Date('2026-01-10T10:05:00.000Z'),
          source: 'backend',
          category: 'audit',
          level: 'info',
          event: 'restaurant.product.updated',
          message: 'Product updated.',
          userId: 'real-user-1',
          metadata: { entityType: 'product', entityId: 'prod-real', entityLabel: 'Real product', result: 'succeeded' },
        },
      ],
    });

    const options = await service.listEntityOptions('product', undefined, ['demo-user-1']);

    expect(options).toEqual([{ id: 'prod-demo', label: 'Demo product' }]);
  });

  it('lists distinct actor options derived from auth audit events, restricted by user ids', async () => {
    await prisma.appLog.createMany({
      data: [
        {
          timestamp: new Date('2026-01-10T10:00:00.000Z'),
          source: 'backend',
          category: 'audit',
          level: 'info',
          event: 'auth.login.succeeded',
          message: 'User signed in.',
          userId: 'demo-user-1',
          metadata: { entityType: 'auth', entityId: 'demo-user-1', entityLabel: 'developer@mesaflow.demo', result: 'succeeded' },
        },
        {
          timestamp: new Date('2026-01-10T10:05:00.000Z'),
          source: 'backend',
          category: 'audit',
          level: 'info',
          event: 'auth.login.succeeded',
          message: 'User signed in.',
          userId: 'real-user-1',
          metadata: { entityType: 'auth', entityId: 'real-user-1', entityLabel: 'admin@example.com', result: 'succeeded' },
        },
      ],
    });

    const allOptions = await service.listActorOptions();
    expect(allOptions).toEqual(expect.arrayContaining([
      { id: 'demo-user-1', label: 'developer@mesaflow.demo' },
      { id: 'real-user-1', label: 'admin@example.com' },
    ]));

    const restrictedOptions = await service.listActorOptions(['demo-user-1']);
    expect(restrictedOptions).toEqual([{ id: 'demo-user-1', label: 'developer@mesaflow.demo' }]);
  });

  it('purges non-audit logs past their retention window while keeping audit logs within theirs', async () => {
    const now = new Date('2026-06-01T00:00:00.000Z');
    await prisma.appLog.createMany({
      data: [
        // non-audit, older than 30 days -> purged
        { timestamp: new Date('2026-04-01T00:00:00.000Z'), source: 'backend', category: 'request', level: 'info', event: 'http.request.completed', message: 'old request' },
        // non-audit, within 30 days -> kept
        { timestamp: new Date('2026-05-25T00:00:00.000Z'), source: 'backend', category: 'request', level: 'info', event: 'http.request.completed', message: 'recent request' },
        // audit, 61 days old -> within the 90-day audit window -> kept
        { timestamp: new Date('2026-04-01T00:00:00.000Z'), source: 'backend', category: 'audit', level: 'info', event: 'auth.login.succeeded', message: 'old audit' },
        // audit, 100 days old -> past the 90-day audit window -> purged
        { timestamp: new Date('2026-02-20T00:00:00.000Z'), source: 'backend', category: 'audit', level: 'info', event: 'auth.login.succeeded', message: 'ancient audit' },
      ],
    });

    await service.purgeExpired(now);

    const remainingMessages = (await prisma.appLog.findMany({ orderBy: { timestamp: 'asc' } })).map((row) => row.message);
    expect(remainingMessages).toEqual(expect.arrayContaining(['old audit', 'recent request']));
    expect(remainingMessages).not.toEqual(expect.arrayContaining(['old request', 'ancient audit']));
  });
});
