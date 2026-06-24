import type { PrismaClient } from '@prisma/client';

import { DEMO_ACCOUNT_CATALOG } from '../../src/identity/domain/demo-account-catalog';
import { MESAFLOW_DEMO_ORGANIZATION_NAME, MESAFLOW_DEMO_RESTAURANT_NAME } from './mesaflow-demo.seed';

const ORDER_SERVICE_ID = 'order-demo-service';
const ORDER_BAR_ID = 'order-demo-bar';
const ORDER_SERVED_ID = 'order-demo-served';
const ORDER_GROUP_ID = 'order-demo-group';
const ORDER_PAID_ID = 'order-demo-paid';

export async function seedMesaFlowOrdersDemo(prisma: PrismaClient): Promise<void> {
  const organization = await prisma.organization.findUnique({
    where: { name: MESAFLOW_DEMO_ORGANIZATION_NAME },
  });
  if (!organization) {
    throw new Error('MesaFlow demo organization must exist before orders are seeded.');
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: {
      organizationId: organization.id,
      name: MESAFLOW_DEMO_RESTAURANT_NAME,
    },
  });
  if (!restaurant) {
    throw new Error('MesaFlow demo restaurant must exist before orders are seeded.');
  }

  const waiterAccount = DEMO_ACCOUNT_CATALOG.find((account) => account.role === 'waiter');
  const managerAccount = DEMO_ACCOUNT_CATALOG.find((account) => account.role === 'manager');
  if (!waiterAccount || !managerAccount) {
    throw new Error('Missing demo accounts for orders seed.');
  }

  const [waiterUser, managerUser] = await Promise.all([
    prisma.user.findUnique({ where: { email: waiterAccount.email } }),
    prisma.user.findUnique({ where: { email: managerAccount.email } }),
  ]);
  if (!waiterUser || !managerUser) {
    throw new Error('Demo users must exist before orders are seeded.');
  }

  const products = await prisma.product.findMany({
    where: {
      organizationId: organization.id,
      name: {
        in: [
          'Hamburguesa craft',
          'Menu Classic Burger',
          'Plato combinado vegetal',
          'Cerveza',
          'Cafe solo',
          'Tarta de queso',
          'Nachos caseros',
        ],
      },
    },
  });
  const productByName = new Map(products.map((product) => [product.name, product]));

  const sales = await prisma.restaurantProduct.findMany({
    where: {
      restaurantId: restaurant.id,
    },
  });
  const saleByProductId = new Map(sales.map((sale) => [sale.productId, sale]));
  const saleByLabel = new Map(
    sales.map((sale) => [
      sale.displayName ?? products.find((product) => product.id === sale.productId)?.name ?? sale.id,
      sale,
    ]),
  );

  const burgerProduct = requiredProduct(productByName, 'Hamburguesa craft');
  const comboProduct = requiredProduct(productByName, 'Menu Classic Burger');
  const platterProduct = requiredProduct(productByName, 'Plato combinado vegetal');
  const nachosProduct = requiredProduct(productByName, 'Nachos caseros');
  const dessertProduct = requiredProduct(productByName, 'Tarta de queso');
  const coffeeProduct = requiredProduct(productByName, 'Cafe solo');
  const burgerSale = requiredSale(saleByProductId, burgerProduct.id, 'Hamburguesa craft');
  const comboSale = requiredSale(saleByProductId, comboProduct.id, 'Menu Classic Burger');
  const platterSale = requiredSale(saleByProductId, platterProduct.id, 'Plato combinado vegetal');
  const nachosSale = requiredSale(saleByProductId, nachosProduct.id, 'Nachos caseros');
  const dessertSale = requiredSale(saleByProductId, dessertProduct.id, 'Tarta de queso');
  const coffeeSale = requiredSale(saleByProductId, coffeeProduct.id, 'Cafe solo');
  const beerSale = requiredNamedSale(saleByLabel, 'Cerveza');

  await upsertOrder(prisma, {
    id: ORDER_SERVICE_ID,
    restaurantId: restaurant.id,
    tableId: 'table-3',
    status: 'open',
    openedByUserId: waiterUser.id,
    currency: 'EUR',
    guestCount: 2,
    subtotalCents: 2940,
    taxCents: 509,
    discountTotalCents: 0,
    totalCents: 2940,
    closedAt: null,
  });
  await replaceOrderLines(prisma, ORDER_SERVICE_ID, [
    {
      id: 'line-burger',
      restaurantProductId: burgerSale.id,
      productId: burgerProduct.id,
      productNameSnapshot: 'Hamburguesa craft',
      productTypeSnapshot: 'simple',
      courseSnapshot: 'main',
      preparationRouteSnapshot: 'kitchen',
      basePriceCentsSnapshot: 1250,
      unitPriceCents: 1350,
      quantity: 1,
      subtotalCents: 1350,
      taxRateNameSnapshot: 'IVA General',
      taxRatePercentSnapshot: '21.00',
      taxCents: 234,
      status: 'preparing',
      kitchenNote: 'Sin cebolla',
      configurationSignature: 'burger::cheese::sin-cebolla',
    },
    {
      id: 'line-combo',
      restaurantProductId: comboSale.id,
      productId: comboProduct.id,
      productNameSnapshot: 'Menu Classic Burger',
      productTypeSnapshot: 'combo',
      courseSnapshot: 'main',
      preparationRouteSnapshot: 'kitchen',
      basePriceCentsSnapshot: 1390,
      unitPriceCents: 1590,
      quantity: 1,
      subtotalCents: 1590,
      taxRateNameSnapshot: 'IVA General',
      taxRatePercentSnapshot: '21.00',
      taxCents: 275,
      status: 'pending',
      kitchenNote: null,
      configurationSignature: 'combo::beer',
    },
  ]);
  await attachOrderArtifacts(prisma, ORDER_SERVICE_ID, {
    modifiers: [
      {
        lineConfigurationSignature: 'burger::cheese::sin-cebolla',
        groupNameSnapshot: 'Extras',
        optionNameSnapshot: 'Queso',
        priceDeltaCents: 100,
      },
    ],
    comboSlots: [
      {
        lineConfigurationSignature: 'combo::beer',
        slotNameSnapshot: 'Bebida',
        selectedProductNameSnapshot: beerSale.displayName ?? 'Cerveza',
        supplementPriceCents: 150,
      },
    ],
    platterComponents: [],
    discounts: [],
    payments: [],
  });

  await upsertOrder(prisma, {
    id: ORDER_BAR_ID,
    restaurantId: restaurant.id,
    tableId: 'table-2',
    status: 'open',
    openedByUserId: waiterUser.id,
    currency: 'EUR',
    guestCount: 1,
    subtotalCents: 880,
    taxCents: 80,
    discountTotalCents: 0,
    totalCents: 880,
    closedAt: null,
  });
  await replaceOrderLines(prisma, ORDER_BAR_ID, [
    {
      id: 'line-bar-beer-1',
      restaurantProductId: beerSale.id,
      productId: beerSale.productId,
      productNameSnapshot: 'Cerveza',
      productTypeSnapshot: 'simple',
      courseSnapshot: 'drinks',
      preparationRouteSnapshot: 'bar',
      basePriceCentsSnapshot: 350,
      unitPriceCents: 350,
      quantity: 2,
      subtotalCents: 700,
      taxRateNameSnapshot: 'IVA General',
      taxRatePercentSnapshot: '21.00',
      taxCents: 121,
      status: 'served',
      kitchenNote: null,
      configurationSignature: 'bar::beer-double',
    },
    {
      id: 'line-bar-coffee',
      restaurantProductId: coffeeSale.id,
      productId: coffeeProduct.id,
      productNameSnapshot: 'Cafe solo',
      productTypeSnapshot: 'simple',
      courseSnapshot: 'drinks',
      preparationRouteSnapshot: 'bar',
      basePriceCentsSnapshot: 180,
      unitPriceCents: 180,
      quantity: 1,
      subtotalCents: 180,
      taxRateNameSnapshot: 'IVA Reducido',
      taxRatePercentSnapshot: '10.00',
      taxCents: 16,
      status: 'served',
      kitchenNote: null,
      configurationSignature: 'bar::coffee',
    },
  ]);
  await attachOrderArtifacts(prisma, ORDER_BAR_ID, {
    modifiers: [],
    comboSlots: [],
    platterComponents: [],
    discounts: [],
    payments: [],
  });

  await upsertOrder(prisma, {
    id: ORDER_SERVED_ID,
    restaurantId: restaurant.id,
    tableId: 'stool-3',
    status: 'pending_payment',
    openedByUserId: waiterUser.id,
    currency: 'EUR',
    guestCount: 1,
    subtotalCents: 1190,
    taxCents: 207,
    discountTotalCents: 0,
    totalCents: 1190,
    closedAt: null,
  });
  await replaceOrderLines(prisma, ORDER_SERVED_ID, [
    {
      id: 'line-platter',
      restaurantProductId: platterSale.id,
      productId: platterProduct.id,
      productNameSnapshot: 'Plato combinado vegetal',
      productTypeSnapshot: 'platter',
      courseSnapshot: 'main',
      preparationRouteSnapshot: 'kitchen',
      basePriceCentsSnapshot: 1190,
      unitPriceCents: 1190,
      quantity: 1,
      subtotalCents: 1190,
      taxRateNameSnapshot: 'IVA General',
      taxRatePercentSnapshot: '21.00',
      taxCents: 207,
      status: 'served',
      kitchenNote: null,
      configurationSignature: 'platter::egg-removed',
    },
  ]);
  await attachOrderArtifacts(prisma, ORDER_SERVED_ID, {
    modifiers: [],
    comboSlots: [],
    platterComponents: [
      {
        lineConfigurationSignature: 'platter::egg-removed',
        componentNameSnapshot: 'Huevo',
        removed: true,
        replacementNameSnapshot: null,
        priceDeltaCents: 0,
      },
      {
        lineConfigurationSignature: 'platter::egg-removed',
        componentNameSnapshot: 'Patatas fritas',
        removed: false,
        replacementNameSnapshot: null,
        priceDeltaCents: 0,
      },
    ],
    discounts: [],
    payments: [],
  });

  await upsertOrder(prisma, {
    id: ORDER_GROUP_ID,
    restaurantId: restaurant.id,
    tableId: 'table-4',
    status: 'pending_payment',
    openedByUserId: waiterUser.id,
    currency: 'EUR',
    guestCount: 4,
    subtotalCents: 1930,
    taxCents: 175,
    discountTotalCents: 100,
    totalCents: 1830,
    closedAt: null,
  });
  await replaceOrderLines(prisma, ORDER_GROUP_ID, [
    {
      id: 'line-group-nachos',
      restaurantProductId: nachosSale.id,
      productId: nachosProduct.id,
      productNameSnapshot: 'Nachos caseros',
      productTypeSnapshot: 'simple',
      courseSnapshot: 'starter',
      preparationRouteSnapshot: 'kitchen',
      basePriceCentsSnapshot: 890,
      unitPriceCents: 990,
      quantity: 1,
      subtotalCents: 990,
      taxRateNameSnapshot: 'IVA Reducido',
      taxRatePercentSnapshot: '10.00',
      taxCents: 90,
      status: 'served',
      kitchenNote: null,
      configurationSignature: 'nachos::guacamole',
    },
    {
      id: 'line-group-dessert',
      restaurantProductId: dessertSale.id,
      productId: dessertProduct.id,
      productNameSnapshot: 'Tarta de queso',
      productTypeSnapshot: 'simple',
      courseSnapshot: 'dessert',
      preparationRouteSnapshot: 'dessert_station',
      basePriceCentsSnapshot: 520,
      unitPriceCents: 470,
      quantity: 2,
      subtotalCents: 940,
      taxRateNameSnapshot: 'IVA Reducido',
      taxRatePercentSnapshot: '10.00',
      taxCents: 85,
      status: 'served',
      kitchenNote: null,
      configurationSignature: 'dessert::group',
    },
  ]);
  await attachOrderArtifacts(prisma, ORDER_GROUP_ID, {
    modifiers: [
      {
        lineConfigurationSignature: 'nachos::guacamole',
        groupNameSnapshot: 'Salsas',
        optionNameSnapshot: 'Guacamole',
        priceDeltaCents: 100,
      },
    ],
    comboSlots: [],
    platterComponents: [],
    discounts: [
      {
        type: 'fixed_amount',
        value: '100.00',
        reason: 'Invitacion postre',
        createdByUserId: managerUser.id,
      },
    ],
    payments: [],
  });

  await upsertOrder(prisma, {
    id: ORDER_PAID_ID,
    restaurantId: restaurant.id,
    tableId: 'table-1',
    status: 'paid',
    openedByUserId: waiterUser.id,
    currency: 'EUR',
    guestCount: 2,
    subtotalCents: 1190,
    taxCents: 207,
    discountTotalCents: 119,
    totalCents: 1071,
    closedAt: new Date('2026-06-21T11:30:00.000Z'),
  });
  await replaceOrderLines(prisma, ORDER_PAID_ID, [
    {
      id: 'line-paid-burger',
      restaurantProductId: burgerSale.id,
      productId: burgerProduct.id,
      productNameSnapshot: 'Hamburguesa craft',
      productTypeSnapshot: 'simple',
      courseSnapshot: 'main',
      preparationRouteSnapshot: 'kitchen',
      basePriceCentsSnapshot: 1250,
      unitPriceCents: 1190,
      quantity: 1,
      subtotalCents: 1190,
      taxRateNameSnapshot: 'IVA General',
      taxRatePercentSnapshot: '21.00',
      taxCents: 207,
      status: 'served',
      kitchenNote: null,
      configurationSignature: 'burger::plain',
    },
  ]);
  await attachOrderArtifacts(prisma, ORDER_PAID_ID, {
    modifiers: [],
    comboSlots: [],
    platterComponents: [],
    discounts: [
      {
        type: 'percentage',
        value: '10.00',
        reason: 'Descuento encargado',
        createdByUserId: managerUser.id,
      },
    ],
    payments: [
      {
        method: 'cash',
        amountCents: 1071,
        status: 'completed',
        paidAt: new Date('2026-06-21T11:30:00.000Z'),
      },
    ],
  });
}

async function upsertOrder(
  prisma: PrismaClient,
  order: {
    id: string;
    restaurantId: string;
    tableId: string | null;
    status: 'open' | 'pending_payment' | 'paid' | 'cancelled';
    openedByUserId: string;
    currency: string;
    guestCount: number;
    subtotalCents: number;
    taxCents: number;
    discountTotalCents: number;
    totalCents: number;
    closedAt: Date | null;
  },
): Promise<void> {
  await prisma.order.upsert({
    where: { id: order.id },
    update: {
      restaurantId: order.restaurantId,
      tableId: order.tableId,
      status: order.status,
      openedByUserId: order.openedByUserId,
      currency: order.currency,
      guestCount: order.guestCount,
      subtotalCents: order.subtotalCents,
      taxCents: order.taxCents,
      discountTotalCents: order.discountTotalCents,
      totalCents: order.totalCents,
      closedAt: order.closedAt,
    },
    create: order,
  });
}

async function replaceOrderLines(
  prisma: PrismaClient,
  orderId: string,
  lines: Array<{
    id: string;
    restaurantProductId: string | null;
    productId: string | null;
    productNameSnapshot: string;
    productTypeSnapshot: 'simple' | 'combo' | 'platter';
    courseSnapshot: 'drinks' | 'starter' | 'main' | 'dessert' | 'other';
    preparationRouteSnapshot: 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station';
    basePriceCentsSnapshot: number;
    unitPriceCents: number;
    quantity: number;
    subtotalCents: number;
    taxRateNameSnapshot: string | null;
    taxRatePercentSnapshot: string | null;
    taxCents: number;
    status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
    kitchenNote: string | null;
    configurationSignature: string;
  }>,
): Promise<void> {
  await prisma.orderLine.deleteMany({ where: { orderId } });
  await prisma.orderLine.createMany({
    data: lines.map((line) => ({
      ...line,
      orderId,
    })),
  });
}

async function attachOrderArtifacts(
  prisma: PrismaClient,
  orderId: string,
  artifacts: {
    modifiers: Array<{
      lineConfigurationSignature: string;
      groupNameSnapshot: string;
      optionNameSnapshot: string;
      priceDeltaCents: number;
    }>;
    comboSlots: Array<{
      lineConfigurationSignature: string;
      slotNameSnapshot: string;
      selectedProductNameSnapshot: string;
      supplementPriceCents: number;
    }>;
    platterComponents: Array<{
      lineConfigurationSignature: string;
      componentNameSnapshot: string;
      removed: boolean;
      replacementNameSnapshot: string | null;
      priceDeltaCents: number;
    }>;
    discounts: Array<{
      type: 'percentage' | 'fixed_amount';
      value: string;
      reason: string | null;
      createdByUserId: string;
    }>;
    payments: Array<{
      method: 'cash' | 'card' | 'bizum' | 'other';
      amountCents: number;
      status: 'pending' | 'completed' | 'failed' | 'refunded';
      paidAt: Date | null;
    }>;
  },
): Promise<void> {
  const lines = await prisma.orderLine.findMany({
    where: { orderId },
  });
  const lineIdBySignature = new Map(lines.map((line) => [line.configurationSignature, line.id]));

  await prisma.orderLineModifier.deleteMany({ where: { orderLine: { orderId } } });
  await prisma.orderLineComboSlot.deleteMany({ where: { orderLine: { orderId } } });
  await prisma.orderLinePlatterComponent.deleteMany({ where: { orderLine: { orderId } } });
  await prisma.orderDiscount.deleteMany({ where: { orderId } });
  await prisma.payment.deleteMany({ where: { orderId } });

  if (artifacts.modifiers.length > 0) {
    await prisma.orderLineModifier.createMany({
      data: artifacts.modifiers.map((modifier) => ({
        orderLineId: requiredLineId(lineIdBySignature, modifier.lineConfigurationSignature),
        groupNameSnapshot: modifier.groupNameSnapshot,
        optionNameSnapshot: modifier.optionNameSnapshot,
        priceDeltaCents: modifier.priceDeltaCents,
      })),
    });
  }

  if (artifacts.comboSlots.length > 0) {
    await prisma.orderLineComboSlot.createMany({
      data: artifacts.comboSlots.map((slot) => ({
        orderLineId: requiredLineId(lineIdBySignature, slot.lineConfigurationSignature),
        slotNameSnapshot: slot.slotNameSnapshot,
        selectedProductNameSnapshot: slot.selectedProductNameSnapshot,
        supplementPriceCents: slot.supplementPriceCents,
      })),
    });
  }

  if (artifacts.platterComponents.length > 0) {
    await prisma.orderLinePlatterComponent.createMany({
      data: artifacts.platterComponents.map((component) => ({
        orderLineId: requiredLineId(lineIdBySignature, component.lineConfigurationSignature),
        componentNameSnapshot: component.componentNameSnapshot,
        removed: component.removed,
        replacementNameSnapshot: component.replacementNameSnapshot,
        priceDeltaCents: component.priceDeltaCents,
      })),
    });
  }

  if (artifacts.discounts.length > 0) {
    await prisma.orderDiscount.createMany({
      data: artifacts.discounts.map((discount) => ({
        orderId,
        type: discount.type,
        value: discount.value,
        reason: discount.reason,
        createdByUserId: discount.createdByUserId,
      })),
    });
  }

  if (artifacts.payments.length > 0) {
    await prisma.payment.createMany({
      data: artifacts.payments.map((payment) => ({
        orderId,
        method: payment.method,
        amountCents: payment.amountCents,
        status: payment.status,
        paidAt: payment.paidAt,
      })),
    });
  }
}

function requiredProduct(
  products: Map<string, { id: string; name: string; productType: string }>,
  name: string,
): { id: string; name: string; productType: string } {
  const product = products.get(name);
  if (!product) {
    throw new Error(`Missing demo product "${name}".`);
  }
  return product;
}

function requiredSale(
  sales: Map<string, { id: string; productId: string; displayName: string | null; priceCents: number; currency: string }>,
  productId: string,
  label: string,
): { id: string; productId: string; displayName: string | null; priceCents: number; currency: string } {
  const sale = sales.get(productId);
  if (!sale) {
    throw new Error(`Missing restaurant product for "${label}".`);
  }
  return sale;
}

function requiredNamedSale(
  sales: Map<string, { id: string; productId: string; displayName: string | null; priceCents: number; currency: string }>,
  name: string,
): { id: string; productId: string; displayName: string | null; priceCents: number; currency: string } {
  const sale = sales.get(name);
  if (!sale) {
    throw new Error(`Missing named restaurant product "${name}".`);
  }
  return sale;
}

function requiredLineId(lineIdBySignature: Map<string, string>, signature: string): string {
  const lineId = lineIdBySignature.get(signature);
  if (!lineId) {
    throw new Error(`Missing order line for configuration signature "${signature}".`);
  }
  return lineId;
}
