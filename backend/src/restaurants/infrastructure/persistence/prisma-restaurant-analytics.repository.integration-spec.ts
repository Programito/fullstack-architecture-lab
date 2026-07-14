/**
 * Integration spec for PrismaRestaurantAnalyticsRepository.
 * Requires Docker (Testcontainers). Run with:
 * `pnpm test:integration -- prisma-restaurant-analytics.repository.integration-spec.ts`
 */
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runPnpmCommand } from '../../../shared/prisma/run-pnpm-command';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { PrismaRestaurantAnalyticsRepository } from './prisma-restaurant-analytics.repository';

describe('PrismaRestaurantAnalyticsRepository', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let repository: PrismaRestaurantAnalyticsRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    process.env.DATABASE_URL = container.getConnectionUri();

    runPnpmCommand(['prisma', 'migrate', 'deploy'], process.cwd());
    runPnpmCommand(['prisma', 'db', 'seed'], process.cwd());

    prisma = new PrismaService();
    await prisma.$connect();
    repository = new PrismaRestaurantAnalyticsRepository(prisma);

    // The shared seed leaves `createdAt` at whatever instant the seed script
    // actually ran (Prisma's `@default(now())`), which would make the peak-hours
    // assertion below flaky. Pin it explicitly so "hour" is deterministic.
    await prisma.order.update({
      where: { id: 'order-demo-paid' },
      data: { createdAt: new Date('2026-06-21T11:15:00.000Z') },
    });
  }, 120_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
  });

  it('aggregates the seeded paid order into the analytics report for its closed day', async () => {
    const report = await repository.getReport({
      restaurantId: 'restaurant-mesaflow-centro',
      from: '2026-06-21T00:00:00.000Z',
      to: '2026-06-21T23:59:59.000Z',
    });

    expect(report.summary.revenueCents).toBe(1071);
    expect(report.summary.ordersCount).toBe(1);
    expect(report.summary.averageTicketCents).toBe(1071);
    expect(report.summary.averageTableTurnoverMinutes).toBe(15);

    // The immediately preceding day (2026-06-20) has no paid orders seeded.
    expect(report.previousSummary).toEqual({
      revenueCents: 0,
      ordersCount: 0,
      averageTicketCents: 0,
      averageTableTurnoverMinutes: 0,
    });

    expect(report.salesByDay).toEqual([{ date: '2026-06-21', revenueCents: 1071, ordersCount: 1 }]);

    // Same reasoning as `previousSummary` above: 2026-06-20 has no paid orders seeded.
    expect(report.previousSalesByDay).toEqual([]);

    expect(report.topProducts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productName: 'Hamburguesa craft', quantity: 1, revenueCents: 1190 }),
      ]),
    );

    expect(report.paymentBreakdown).toEqual([{ method: 'cash', amountCents: 1071, count: 1 }]);

    expect(report.peakHours).toEqual(expect.arrayContaining([expect.objectContaining({ hour: 11, ordersCount: 1 })]));
  });

  it('reports the immediately preceding day as previousSalesByDay', async () => {
    const report = await repository.getReport({
      restaurantId: 'restaurant-mesaflow-centro',
      from: '2026-06-22T00:00:00.000Z',
      to: '2026-06-22T23:59:59.000Z',
    });

    // The current period (2026-06-22) has no paid orders seeded, but the
    // immediately preceding day (2026-06-21) has the same seeded order used
    // in the first test above.
    expect(report.salesByDay).toEqual([]);
    expect(report.previousSalesByDay).toEqual([{ date: '2026-06-21', revenueCents: 1071, ordersCount: 1 }]);
  });

  it('returns empty aggregates for a date range with no paid orders', async () => {
    const report = await repository.getReport({
      restaurantId: 'restaurant-mesaflow-centro',
      from: '2000-01-01T00:00:00.000Z',
      to: '2000-01-02T00:00:00.000Z',
    });

    expect(report.summary).toEqual({
      revenueCents: 0,
      ordersCount: 0,
      averageTicketCents: 0,
      averageTableTurnoverMinutes: 0,
    });
    expect(report.previousSummary).toEqual({
      revenueCents: 0,
      ordersCount: 0,
      averageTicketCents: 0,
      averageTableTurnoverMinutes: 0,
    });
    expect(report.salesByDay).toEqual([]);
    expect(report.previousSalesByDay).toEqual([]);
    expect(report.topProducts).toEqual([]);
    expect(report.paymentBreakdown).toEqual([]);
    expect(report.peakHours).toEqual([]);
  });
});
