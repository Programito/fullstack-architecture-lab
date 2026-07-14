/**
 * Integration spec for PrismaRestaurantReadRepository.
 * Requires Docker (Testcontainers). Run with:
 * `pnpm test:integration -- prisma-restaurant-read.repository.integration-spec.ts`
 */
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runPnpmCommand } from '../../../shared/prisma/run-pnpm-command';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { PrismaRestaurantReadRepository } from './prisma-restaurant-read.repository';

describe('PrismaRestaurantReadRepository', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let repository: PrismaRestaurantReadRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    process.env.DATABASE_URL = container.getConnectionUri();

    runPnpmCommand(['prisma', 'migrate', 'deploy'], process.cwd());
    runPnpmCommand(['prisma', 'db', 'seed'], process.cwd());

    prisma = new PrismaService();
    await prisma.$connect();
    repository = new PrismaRestaurantReadRepository(prisma);
  }, 120_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
  });

  it('lists the seeded demo restaurant', async () => {
    const restaurants = await repository.listRestaurants(['restaurant-mesaflow-centro'], []);

    expect(restaurants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'restaurant-mesaflow-centro',
          name: 'MesaFlow Centro',
          timezone: 'Europe/Madrid',
          currency: 'EUR',
        }),
      ]),
    );
  });

  it('lists seeded reservations for the demo restaurant', async () => {
    const reservations = await repository.listReservationsByRestaurantId('restaurant-mesaflow-centro');

    expect(reservations).not.toBeNull();
    expect(reservations?.length).toBeGreaterThan(0);
    expect(reservations?.[0]).toEqual(
      expect.objectContaining({
        customerNameSnapshot: expect.any(String),
        reservationAt: expect.any(String),
        tables: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            tableNumber: expect.any(Number),
          }),
        ]),
      }),
    );
  });
});
