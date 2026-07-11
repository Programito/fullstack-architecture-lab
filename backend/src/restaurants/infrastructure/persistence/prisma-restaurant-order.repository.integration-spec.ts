/**
 * Integration spec for PrismaRestaurantOrderRepository.
 * Requires Docker (Testcontainers). Run with:
 * `pnpm test:integration -- prisma-restaurant-order.repository.integration-spec.ts`
 */
import { execFileSync } from 'node:child_process';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import { PrismaRestaurantOrderRepository } from './prisma-restaurant-order.repository';

describe('PrismaRestaurantOrderRepository (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let repository: PrismaRestaurantOrderRepository;

  let restaurantId: string;
  let tableId: string;
  let userId: string;

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
    repository = new PrismaRestaurantOrderRepository(prisma);
  }, 120_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
  });

  beforeEach(async () => {
    await prisma.payment.deleteMany();
    await prisma.orderLineModifier.deleteMany();
    await prisma.orderLineComboSlot.deleteMany();
    await prisma.orderLinePlatterComponent.deleteMany();
    await prisma.orderLine.deleteMany();
    await prisma.order.deleteMany();
    await prisma.restaurantTable.deleteMany();
    await prisma.userRoleAssignment.deleteMany();
    await prisma.user.deleteMany();
    await prisma.restaurant.deleteMany();
    await prisma.organization.deleteMany();

    const organization = await prisma.organization.create({
      data: { name: 'MesaFlow Test Org', accountType: 'demo' },
    });
    const restaurant = await prisma.restaurant.create({
      data: {
        organizationId: organization.id,
        name: 'MesaFlow Centro',
        timezone: 'Europe/Madrid',
        currency: 'EUR',
      },
    });
    const table = await prisma.restaurantTable.create({
      data: { restaurantId: restaurant.id, tableNumber: 3, name: 'Mesa 3', capacity: 4 },
    });
    const user = await prisma.user.create({
      data: {
        email: 'waiter@test.demo',
        firstName: 'Carlos',
        lastName: 'Camarero',
        passwordHash: 'hashed',
      },
    });

    restaurantId = restaurant.id;
    tableId = table.id;
    userId = user.id;
  });

  it('opens a new order for a table', async () => {
    const view = await repository.open({ restaurantId, tableId, openedByUserId: userId, guestCount: 2 });

    expect(view.order.restaurantId).toBe(restaurantId);
    expect(view.order.tableId).toBe(tableId);
    expect(view.order.status).toBe('open');
    expect(view.order.guestCount).toBe(2);
    expect(view.order.dailyNumber).toBe(1);
    expect(view.lines).toEqual([]);
    expect(view.payments).toEqual([]);
  });

  it('assigns sequential dailyNumber per restaurant for orders opened the same day', async () => {
    const secondTable = await prisma.restaurantTable.create({
      data: { restaurantId, tableNumber: 4, name: 'Mesa 4', capacity: 4 },
    });

    const first = await repository.open({ restaurantId, tableId, openedByUserId: userId, guestCount: 2 });
    const second = await repository.open({
      restaurantId,
      tableId: secondTable.id,
      openedByUserId: userId,
      guestCount: 2,
    });

    expect(first.order.dailyNumber).toBe(1);
    expect(second.order.dailyNumber).toBe(2);
  });

  it('rejects a second open call for a table that already has an active order', async () => {
    await repository.open({ restaurantId, tableId, openedByUserId: userId, guestCount: 2 });

    await expect(
      repository.open({ restaurantId, tableId, openedByUserId: userId, guestCount: 2 }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('returns null when no active order exists for the table', async () => {
    const result = await repository.findActiveByTable(restaurantId, tableId);
    expect(result).toBeNull();
  });

  it('finds an order by id', async () => {
    const opened = await repository.open({ restaurantId, tableId, openedByUserId: userId, guestCount: 4 });

    const found = await repository.findById(restaurantId, opened.order.id);

    expect(found?.order.id).toBe(opened.order.id);
    expect(found?.order.guestCount).toBe(4);
  });
});
