/**
 * Integration spec for PrismaRestaurantOrderRepository.
 * Requires Docker (Testcontainers). Run with:
 * `pnpm test:integration -- prisma-restaurant-order.repository.integration-spec.ts`
 */
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runPnpmCommand } from '../../../shared/prisma/run-pnpm-command';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { PrismaRestaurantOrderRepository } from './prisma-restaurant-order.repository';

describe('PrismaRestaurantOrderRepository (integration)', () => {
  const concurrentQueryDeprecation =
    'Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead.';
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let repository: PrismaRestaurantOrderRepository;
  const warnings: Error[] = [];
  const captureWarning = (warning: Error) => warnings.push(warning);

  let restaurantId: string;
  let tableId: string;
  let userId: string;

  beforeAll(async () => {
    process.on('warning', captureWarning);
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    process.env.DATABASE_URL = container.getConnectionUri();

    runPnpmCommand(['prisma', 'migrate', 'deploy'], process.cwd());

    prisma = new PrismaService();
    await prisma.$connect();
    repository = new PrismaRestaurantOrderRepository(prisma);
  }, 120_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
    await new Promise<void>((resolve) => setImmediate(resolve));
    process.off('warning', captureWarning);
    expect(warnings.map((warning) => warning.message)).not.toContain(concurrentQueryDeprecation);
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

  it('clears the active order for a table', async () => {
    const opened = await repository.open({ restaurantId, tableId, openedByUserId: userId, guestCount: 2 });
    await prisma.orderLine.create({
      data: {
        orderId: opened.order.id,
        productNameSnapshot: 'Coca-Cola',
        productTypeSnapshot: 'simple',
        courseSnapshot: 'drinks',
        preparationRouteSnapshot: 'bar',
        basePriceCentsSnapshot: 320,
        unitPriceCents: 320,
        quantity: 1,
        subtotalCents: 320,
        taxCents: 0,
        status: 'pending',
        configurationSignature: 'coke::medium',
      },
    });

    await repository.clearActiveByTable(restaurantId, tableId);

    const active = await repository.findActiveByTable(restaurantId, tableId);
    const persisted = await prisma.order.findUnique({ where: { id: opened.order.id } });
    expect(active).toBeNull();
    expect(persisted).toBeNull();
  });

  it('finds an order by id', async () => {
    const opened = await repository.open({ restaurantId, tableId, openedByUserId: userId, guestCount: 4 });

    const found = await repository.findById(restaurantId, opened.order.id);

    expect(found?.order.id).toBe(opened.order.id);
    expect(found?.order.guestCount).toBe(4);
  });

  it('marks pending lines as preparing when the order is fully paid', async () => {
    const order = await prisma.order.create({
      data: {
        dailyNumber: 1,
        restaurantId,
        tableId,
        openedByUserId: userId,
        status: 'open',
        currency: 'EUR',
        guestCount: 2,
        subtotalCents: 1100,
        taxCents: 0,
        discountTotalCents: 0,
        totalCents: 1100,
      },
    });

    await prisma.orderLine.create({
      data: {
        orderId: order.id,
        productNameSnapshot: 'Coca-Cola',
        productTypeSnapshot: 'simple',
        courseSnapshot: 'drinks',
        preparationRouteSnapshot: 'bar',
        basePriceCentsSnapshot: 1100,
        unitPriceCents: 1100,
        quantity: 1,
        subtotalCents: 1100,
        taxCents: 0,
        status: 'pending',
        configurationSignature: 'coke::medium',
      },
    });

    const paid = await repository.registerPayment({
      restaurantId,
      orderId: order.id,
      amountCents: 1100,
      method: 'card',
    });

    expect(paid.order.status).toBe('paid');
    expect(paid.lines).toHaveLength(1);
    expect(paid.lines[0]?.status).toBe('preparing');
  });

  it('applies a per-product modifier option price override instead of the default price when adding a line', async () => {
    const organization = await prisma.restaurant.findUniqueOrThrow({
      where: { id: restaurantId },
      select: { organizationId: true },
    });

    const product = await prisma.product.create({
      data: {
        organizationId: organization.organizationId,
        name: 'Coca-Cola',
        productType: 'simple',
        defaultCourse: 'drinks',
        defaultPreparationRoute: 'bar',
      },
    });
    const restaurantProduct = await prisma.restaurantProduct.create({
      data: {
        restaurantId,
        productId: product.id,
        priceCents: 250,
        currency: 'EUR',
        sortOrder: 1,
      },
    });
    const modifierGroup = await prisma.modifierGroup.create({
      data: {
        organizationId: organization.organizationId,
        name: 'Tamaño de bebida',
        selectionType: 'single',
        minSelections: 1,
        maxSelections: 1,
        isRequired: true,
      },
    });
    const modifierOption = await prisma.modifierOption.create({
      data: {
        modifierGroupId: modifierGroup.id,
        name: 'XL',
        priceDeltaCents: 100,
        sortOrder: 1,
      },
    });
    await prisma.restaurantProductModifierGroup.create({
      data: { restaurantProductId: restaurantProduct.id, modifierGroupId: modifierGroup.id, sortOrder: 1 },
    });
    await prisma.restaurantProductModifierOptionOverride.create({
      data: { restaurantProductId: restaurantProduct.id, modifierOptionId: modifierOption.id, priceDeltaCents: 150 },
    });

    const opened = await repository.open({ restaurantId, tableId, openedByUserId: userId, guestCount: 1 });

    const view = await repository.addLine({
      restaurantId,
      orderId: opened.order.id,
      restaurantProductId: restaurantProduct.id,
      quantity: 1,
      kitchenNote: null,
      modifiers: [{ modifierGroupId: modifierGroup.id, modifierOptionId: modifierOption.id, quantity: 1 }],
      comboSlots: [],
      platterComponents: [],
    });

    const line = view.lines[0];
    // El override (150) debe prevalecer sobre el priceDeltaCents por defecto del modificador (100).
    expect(line?.modifiers).toEqual([expect.objectContaining({ optionName: 'XL', priceDeltaCents: 150, quantity: 1 })]);
    expect(line?.unitPriceCents).toBe(250 + 150);
  });
});
