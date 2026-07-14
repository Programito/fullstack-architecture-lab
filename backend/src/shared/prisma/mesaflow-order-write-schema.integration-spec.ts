import { Prisma } from '@prisma/client';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaService } from './prisma.service';
import { runPnpmCommand } from './run-pnpm-command';

describe('MesaFlow order write schema', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaService;

  let restaurantId: string;
  let tableId: string;
  let userId: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    process.env.DATABASE_URL = container.getConnectionUri();

    runPnpmCommand(['prisma', 'migrate', 'deploy'], process.cwd());

    prisma = new PrismaService();
    await prisma.$connect();
  }, 60_000);

  beforeEach(async () => {
    await prisma.reservationTable.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.orderLineModifier.deleteMany();
    await prisma.orderLineComboSlot.deleteMany();
    await prisma.orderLinePlatterComponent.deleteMany();
    await prisma.orderDiscount.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.orderLine.deleteMany();
    await prisma.order.deleteMany();
    await prisma.floorElement.deleteMany();
    await prisma.restaurantFloor.deleteMany();
    await prisma.restaurantTable.deleteMany();
    await prisma.comboSlotOption.deleteMany();
    await prisma.comboSlot.deleteMany();
    await prisma.comboDefinition.deleteMany();
    await prisma.platterComponent.deleteMany();
    await prisma.platterDefinition.deleteMany();
    await prisma.restaurantProductModifierGroup.deleteMany();
    await prisma.modifierOption.deleteMany();
    await prisma.modifierGroup.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.menuSection.deleteMany();
    await prisma.restaurantMenu.deleteMany();
    await prisma.restaurantProduct.deleteMany();
    await prisma.product.deleteMany();
    await prisma.taxRate.deleteMany();
    await prisma.userRoleAssignment.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.restaurant.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.role.deleteMany();
    await prisma.authSession.deleteMany();
    await prisma.user.deleteMany();

    const organization = await prisma.organization.create({
      data: { name: 'MesaFlow Test Org', accountType: 'demo' },
    });
    const restaurant = await prisma.restaurant.create({
      data: {
        id: 'restaurant-mesaflow-centro',
        organizationId: organization.id,
        name: 'MesaFlow Centro',
        timezone: 'Europe/Madrid',
        currency: 'EUR',
      },
    });
    const table = await prisma.restaurantTable.create({
      data: {
        id: 'table-3',
        restaurantId: restaurant.id,
        tableNumber: 3,
        name: 'Mesa 3',
        capacity: 6,
      },
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

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
  });

  it('stores order currency, guest count, and tax snapshot fields', async () => {
    const taxRate = await prisma.taxRate.create({
      data: {
        organizationId: (await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, include: { organization: true } })).organization.id,
        name: 'IVA General',
        ratePercent: 21,
      },
    });
    const product = await prisma.product.create({
      data: {
        organizationId: (await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, include: { organization: true } })).organization.id,
        name: 'Hamburguesa craft',
        productType: 'simple',
        defaultCourse: 'main',
        defaultPreparationRoute: 'kitchen',
        taxRateId: taxRate.id,
      },
    });
    const restaurantProduct = await prisma.restaurantProduct.create({
      data: {
        restaurantId,
        productId: product.id,
        priceCents: 1100,
        currency: 'EUR',
        sortOrder: 1,
      },
    });

    const order = await prisma.order.create({
      data: {
        // Ver comentario en activeOrderData() sobre Order.dailyNumber: no es clave de negocio ni
        // tiene restriccion de unicidad, se fija a 1 igual que en el resto de fixtures del repo.
        dailyNumber: 1,
        restaurantId,
        tableId,
        openedByUserId: userId,
        status: 'open',
        currency: 'EUR',
        guestCount: 2,
        subtotalCents: 1100,
        taxCents: 191,
        discountTotalCents: 0,
        totalCents: 1100,
      },
    });

    await prisma.orderLine.create({
      data: {
        orderId: order.id,
        restaurantProductId: restaurantProduct.id,
        productId: product.id,
        productNameSnapshot: 'Hamburguesa craft',
        productTypeSnapshot: 'simple',
        courseSnapshot: 'main',
        preparationRouteSnapshot: 'kitchen',
        basePriceCentsSnapshot: 1100,
        unitPriceCents: 1100,
        quantity: 1,
        subtotalCents: 1100,
        taxRateNameSnapshot: 'IVA General',
        taxRatePercentSnapshot: new Prisma.Decimal('21.00'),
        taxCents: 191,
        status: 'pending',
        configurationSignature: 'burger::plain',
      },
    });

    const stored = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { lines: true, payments: true },
    });

    expect(stored).toMatchObject({
      tableId,
      currency: 'EUR',
      guestCount: 2,
      taxCents: 191,
    });
    expect(stored.lines[0]).toMatchObject({
      taxRateNameSnapshot: 'IVA General',
      taxRatePercentSnapshot: new Prisma.Decimal('21.00'),
      taxCents: 191,
      cancellationReason: null,
      cancelledAt: null,
    });
  });

  it('stores modifier and combo slot quantities', async () => {
    const order = await prisma.order.create({
      data: activeOrderData(restaurantId, tableId, userId),
    });
    const line = await prisma.orderLine.create({
      data: {
        orderId: order.id,
        productNameSnapshot: 'Producto test',
        productTypeSnapshot: 'simple',
        courseSnapshot: 'main',
        preparationRouteSnapshot: 'kitchen',
        basePriceCentsSnapshot: 800,
        unitPriceCents: 900,
        quantity: 2,
        subtotalCents: 1800,
        taxCents: 0,
        status: 'pending',
        configurationSignature: 'test::modifier-quantity',
      },
    });

    await prisma.orderLineModifier.create({
      data: {
        orderLineId: line.id,
        groupNameSnapshot: 'Extras',
        optionNameSnapshot: 'Queso',
        priceDeltaCents: 100,
        quantity: 2,
      },
    });
    await prisma.orderLineComboSlot.create({
      data: {
        orderLineId: line.id,
        slotNameSnapshot: 'Bebida',
        selectedProductNameSnapshot: 'Agua',
        supplementPriceCents: 0,
        quantity: 3,
      },
    });

    const storedModifier = await prisma.orderLineModifier.findFirstOrThrow({
      where: { orderLineId: line.id },
    });
    const storedSlot = await prisma.orderLineComboSlot.findFirstOrThrow({
      where: { orderLineId: line.id },
    });

    expect(storedModifier.quantity).toBe(2);
    expect(storedSlot.quantity).toBe(3);
  });

  it('prevents two active orders for the same table', async () => {
    await prisma.order.create({
      data: activeOrderData(restaurantId, tableId, userId),
    });

    await expect(
      prisma.order.create({ data: activeOrderData(restaurantId, tableId, userId) }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('allows a second order after the first is paid', async () => {
    await prisma.order.create({
      data: { ...activeOrderData(restaurantId, tableId, userId), status: 'paid', closedAt: new Date() },
    });

    await expect(
      prisma.order.create({ data: activeOrderData(restaurantId, tableId, userId) }),
    ).resolves.toBeDefined();
  });
});

function activeOrderData(restaurantId: string, tableId: string, openedByUserId: string) {
  return {
    // Contador diario, no es clave de negocio (ver comentario en schema.prisma sobre Order.dailyNumber)
    // ni tiene restriccion de unicidad; se fija a 1 aqui igual que en el resto de fixtures del
    // repo (grep dailyNumber: 1 en use-cases/*.spec.ts).
    dailyNumber: 1,
    restaurantId,
    tableId,
    openedByUserId,
    status: 'open' as const,
    currency: 'EUR',
    guestCount: 2,
    subtotalCents: 0,
    taxCents: 0,
    discountTotalCents: 0,
    totalCents: 0,
  };
}
