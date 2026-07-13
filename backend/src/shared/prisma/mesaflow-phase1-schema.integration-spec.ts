import { execFileSync } from 'node:child_process';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PrismaService } from './prisma.service';

describe('MesaFlow Phase 1 Prisma schema', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaService;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    process.env.DATABASE_URL = container.getConnectionUri();

    const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
    execFileSync(pnpm, ['prisma', 'db', 'push', '--skip-generate'], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'pipe',
      shell: true,
    });

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
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
  });

  it('stores multi-restaurant assignments and catalog relationships for phase 1', async () => {
    const organization = await prisma.organization.create({
      data: {
        name: 'MesaFlow Demo',
        accountType: 'demo',
      },
    });
    const centro = await prisma.restaurant.create({
      data: {
        organizationId: organization.id,
        name: 'MesaFlow Centro',
        timezone: 'Europe/Madrid',
        currency: 'EUR',
      },
    });
    const terraza = await prisma.restaurant.create({
      data: {
        organizationId: organization.id,
        name: 'MesaFlow Terraza',
        timezone: 'Europe/Madrid',
        currency: 'EUR',
      },
    });
    const waiterRole = await prisma.role.create({ data: { name: 'waiter' } });
    const managerRole = await prisma.role.create({ data: { name: 'manager' } });
    const user = await prisma.user.create({
      data: {
        email: 'waiter@mesaflow.demo',
        firstName: 'Carlos',
        lastName: 'Camarero',
        passwordHash: 'hashed',
      },
    });

    await prisma.userRoleAssignment.createMany({
      data: [
        {
          userId: user.id,
          roleId: waiterRole.id,
          scopeType: 'restaurant',
          organizationId: organization.id,
          restaurantId: centro.id,
        },
        {
          userId: user.id,
          roleId: waiterRole.id,
          scopeType: 'restaurant',
          organizationId: organization.id,
          restaurantId: terraza.id,
        },
        {
          userId: user.id,
          roleId: managerRole.id,
          scopeType: 'organization',
          organizationId: organization.id,
        },
      ],
    });

    const taxRate = await prisma.taxRate.create({
      data: {
        organizationId: organization.id,
        name: 'IVA General',
        ratePercent: 21,
      },
    });
    const burgerProduct = await prisma.product.create({
      data: {
        organizationId: organization.id,
        name: 'Hamburguesa craft',
        productType: 'simple',
        defaultCourse: 'main',
        defaultPreparationRoute: 'kitchen',
        taxRateId: taxRate.id,
      },
    });
    const comboProduct = await prisma.product.create({
      data: {
        organizationId: organization.id,
        name: 'Menu Classic Burger',
        productType: 'combo',
        defaultCourse: 'main',
        defaultPreparationRoute: 'kitchen',
        taxRateId: taxRate.id,
      },
    });
    const platterProduct = await prisma.product.create({
      data: {
        organizationId: organization.id,
        name: 'Plato combinado vegetal',
        productType: 'platter',
        defaultCourse: 'main',
        defaultPreparationRoute: 'kitchen',
        taxRateId: taxRate.id,
      },
    });
    const burgerSale = await prisma.restaurantProduct.create({
      data: {
        restaurantId: centro.id,
        productId: burgerProduct.id,
        priceCents: 1250,
        currency: 'EUR',
        sortOrder: 1,
      },
    });
    const friesSale = await prisma.restaurantProduct.create({
      data: {
        restaurantId: centro.id,
        productId: platterProduct.id,
        displayName: 'Patatas fritas',
        priceCents: 0,
        currency: 'EUR',
        sortOrder: 2,
      },
    });

    const menu = await prisma.restaurantMenu.create({
      data: {
        restaurantId: centro.id,
        name: 'Carta principal',
        isActive: true,
      },
    });
    const section = await prisma.menuSection.create({
      data: {
        menuId: menu.id,
        name: 'Burgers',
        sortOrder: 1,
      },
    });
    await prisma.menuItem.create({
      data: {
        menuSectionId: section.id,
        restaurantProductId: burgerSale.id,
        sortOrder: 1,
      },
    });

    const modifierGroup = await prisma.modifierGroup.create({
      data: {
        organizationId: organization.id,
        name: 'Extras',
        selectionType: 'multiple',
        minSelections: 0,
        maxSelections: 3,
      },
    });
    await prisma.modifierOption.create({
      data: {
        modifierGroupId: modifierGroup.id,
        name: 'Queso',
        priceDeltaCents: 100,
        sortOrder: 1,
      },
    });
    await prisma.restaurantProductModifierGroup.create({
      data: {
        restaurantProductId: burgerSale.id,
        modifierGroupId: modifierGroup.id,
        sortOrder: 1,
      },
    });

    const comboDefinition = await prisma.comboDefinition.create({
      data: {
        productId: comboProduct.id,
        pricingMode: 'base_plus_supplements',
        basePriceCents: 1390,
      },
    });
    const comboSlot = await prisma.comboSlot.create({
      data: {
        comboDefinitionId: comboDefinition.id,
        name: 'Bebida',
        minSelections: 1,
        maxSelections: 1,
        isRequired: true,
        sortOrder: 1,
      },
    });
    await prisma.comboSlotOption.create({
      data: {
        comboSlotId: comboSlot.id,
        restaurantProductId: burgerSale.id,
        supplementPriceCents: 150,
        sortOrder: 1,
      },
    });

    const platterDefinition = await prisma.platterDefinition.create({
      data: {
        productId: platterProduct.id,
      },
    });
    await prisma.platterComponent.create({
      data: {
        platterDefinitionId: platterDefinition.id,
        componentProductId: friesSale.productId,
        name: 'Ensalada',
        isRemovable: true,
        isReplaceable: false,
        sortOrder: 1,
      },
    });

    const storedAssignments = await prisma.userRoleAssignment.findMany({
      where: { userId: user.id },
      orderBy: [{ scopeType: 'asc' }, { restaurantId: 'asc' }],
    });
    const storedBurgerSale = await prisma.restaurantProduct.findUnique({
      where: { restaurantId_productId: { restaurantId: centro.id, productId: burgerProduct.id } },
    });
    const storedMenuItem = await prisma.menuItem.findFirst({
      where: { restaurantProductId: burgerSale.id },
    });
    const storedModifierAttachment = await prisma.restaurantProductModifierGroup.findFirst({
      where: { restaurantProductId: burgerSale.id },
    });
    const storedComboOption = await prisma.comboSlotOption.findFirst({
      where: { comboSlotId: comboSlot.id },
    });
    const storedPlatterComponent = await prisma.platterComponent.findFirst({
      where: { platterDefinitionId: platterDefinition.id },
    });

    expect(storedAssignments).toHaveLength(3);
    expect(storedAssignments.filter((assignment) => assignment.scopeType === 'restaurant')).toHaveLength(2);
    expect(storedAssignments.find((assignment) => assignment.scopeType === 'organization')?.organizationId).toBe(
      organization.id,
    );
    expect(storedBurgerSale?.priceCents).toBe(1250);
    expect(storedBurgerSale?.isAvailable).toBe(true);
    expect(storedMenuItem?.restaurantProductId).toBe(burgerSale.id);
    expect(storedModifierAttachment?.modifierGroupId).toBe(modifierGroup.id);
    expect(storedComboOption?.supplementPriceCents).toBe(150);
    expect(storedPlatterComponent).toMatchObject({
      name: 'Ensalada',
      isRemovable: true,
      isReplaceable: false,
    });
  });
});
