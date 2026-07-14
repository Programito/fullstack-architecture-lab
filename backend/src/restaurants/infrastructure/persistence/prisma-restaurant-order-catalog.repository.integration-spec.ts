import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runPnpmCommand } from '../../../shared/prisma/run-pnpm-command';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { PrismaRestaurantOrderCatalogRepository } from './prisma-restaurant-order-catalog.repository';

describe('PrismaRestaurantOrderCatalogRepository', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let repository: PrismaRestaurantOrderCatalogRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    process.env.DATABASE_URL = container.getConnectionUri();

    runPnpmCommand(['prisma', 'migrate', 'deploy'], process.cwd());
    runPnpmCommand(['prisma', 'db', 'seed'], process.cwd());

    prisma = new PrismaService();
    await prisma.$connect();
    repository = new PrismaRestaurantOrderCatalogRepository(prisma);
  }, 120_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
  });

  it('loads the active menu with backend IDs', async () => {
    const menu = await repository.findActiveMenu('restaurant-mesaflow-centro');

    expect(menu).not.toBeNull();
    expect(menu?.restaurantId).toBe('restaurant-mesaflow-centro');
    expect(menu?.isActive).toBe(true);
    expect(menu?.sections.length).toBeGreaterThan(0);
  });

  it('exposes restaurantProductId and productId on every item', async () => {
    const menu = await repository.findActiveMenu('restaurant-mesaflow-centro');
    const items = menu?.sections.flatMap((s) => s.items) ?? [];

    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.restaurantProductId).toEqual(expect.any(String));
      expect(item.productId).toEqual(expect.any(String));
    }
  });

  it('exposes an allergens array (possibly empty) for every item', async () => {
    const menu = await repository.findActiveMenu('restaurant-mesaflow-centro');
    const items = menu?.sections.flatMap((s) => s.items) ?? [];

    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(Array.isArray(item.allergens)).toBe(true);
    }
  });

  it('exposes modifier group IDs and option IDs for the burger', async () => {
    const menu = await repository.findActiveMenu('restaurant-mesaflow-centro');
    const burger = menu?.sections.flatMap((s) => s.items).find((i) => i.name === 'Hamburguesa craft');

    expect(burger).toMatchObject({
      restaurantProductId: expect.any(String),
      productId: expect.any(String),
      modifierGroups: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          options: expect.arrayContaining([
            expect.objectContaining({ id: expect.any(String), name: 'Queso extra' }),
          ]),
        }),
      ]),
    });
  });

  it('exposes combo slot IDs and option IDs for the combo menu', async () => {
    const menu = await repository.findActiveMenu('restaurant-mesaflow-centro');
    const combo = menu?.sections.flatMap((s) => s.items).find((i) => i.name === 'Menu Classic Burger');

    expect(combo?.comboDefinition).toMatchObject({
      id: expect.any(String),
      slots: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          options: expect.arrayContaining([
            expect.objectContaining({ id: expect.any(String), restaurantProductId: expect.any(String) }),
          ]),
        }),
      ]),
    });
  });

  it('exposes platter component IDs for the platter', async () => {
    const menu = await repository.findActiveMenu('restaurant-mesaflow-centro');
    const platter = menu?.sections.flatMap((s) => s.items).find((i) => i.name === 'Plato combinado vegetal');

    expect(platter?.platterComponents).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: expect.any(String) })]),
    );
  });

  it('returns null for an unknown restaurant', async () => {
    const menu = await repository.findActiveMenu('restaurant-does-not-exist');
    expect(menu).toBeNull();
  });
});
