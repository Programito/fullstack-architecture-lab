import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { seedMesaFlowOrdersDemo } from './mesaflow-orders.seed';

describe('seedMesaFlowOrdersDemo', () => {
  it('creates demo orders with line snapshots, modifiers, combo selections, platter selections, discounts and payments', async () => {
    const organizationFindUnique = vi.fn().mockResolvedValue({ id: 'org-demo' });
    const restaurantFindFirst = vi.fn().mockResolvedValue({ id: 'rest-demo', organizationId: 'org-demo' });
    const userFindUnique = vi.fn().mockImplementation(async ({ where }: { where: { email: string } }) => ({
      id: where.email.includes('manager') ? 'user-manager' : 'user-waiter',
    }));
    const productFindMany = vi.fn().mockResolvedValue([
      { id: 'product-burger', name: 'Hamburguesa craft', productType: 'simple' },
      { id: 'product-combo', name: 'Menu Classic Burger', productType: 'combo' },
      { id: 'product-platter', name: 'Plato combinado vegetal', productType: 'platter' },
    ]);
    const restaurantProductFindMany = vi.fn().mockResolvedValue([
      { id: 'sale-burger', productId: 'product-burger', displayName: null, priceCents: 1250, currency: 'EUR' },
      { id: 'sale-coke', productId: 'product-coke', displayName: 'Coca-Cola', priceCents: 300, currency: 'EUR' },
      { id: 'sale-beer', productId: 'product-beer', displayName: 'Cerveza', priceCents: 350, currency: 'EUR' },
      { id: 'sale-combo', productId: 'product-combo', displayName: null, priceCents: 1390, currency: 'EUR' },
      { id: 'sale-platter', productId: 'product-platter', displayName: null, priceCents: 1190, currency: 'EUR' },
    ]);
    const orderUpsert = vi
      .fn()
      .mockResolvedValueOnce({ id: 'order-service' })
      .mockResolvedValueOnce({ id: 'order-served' })
      .mockResolvedValueOnce({ id: 'order-paid' });
    const orderLineDeleteMany = vi.fn().mockResolvedValue(undefined);
    const orderLineCreateMany = vi.fn().mockResolvedValue(undefined);
    const orderLineFindMany = vi.fn().mockResolvedValue([
      { id: 'line-burger', configurationSignature: 'burger::cheese::sin-cebolla', productNameSnapshot: 'Hamburguesa craft' },
      { id: 'line-combo', configurationSignature: 'combo::beer', productNameSnapshot: 'Menu Classic Burger' },
      { id: 'line-platter', configurationSignature: 'platter::egg-removed', productNameSnapshot: 'Plato combinado vegetal' },
    ]);
    const orderLineModifierDeleteMany = vi.fn().mockResolvedValue(undefined);
    const orderLineModifierCreateMany = vi.fn().mockResolvedValue(undefined);
    const orderLineComboSlotDeleteMany = vi.fn().mockResolvedValue(undefined);
    const orderLineComboSlotCreateMany = vi.fn().mockResolvedValue(undefined);
    const orderLinePlatterComponentDeleteMany = vi.fn().mockResolvedValue(undefined);
    const orderLinePlatterComponentCreateMany = vi.fn().mockResolvedValue(undefined);
    const orderDiscountDeleteMany = vi.fn().mockResolvedValue(undefined);
    const orderDiscountCreateMany = vi.fn().mockResolvedValue(undefined);
    const paymentDeleteMany = vi.fn().mockResolvedValue(undefined);
    const paymentCreateMany = vi.fn().mockResolvedValue(undefined);

    const prisma = {
      organization: { findUnique: organizationFindUnique },
      restaurant: { findFirst: restaurantFindFirst },
      user: { findUnique: userFindUnique },
      product: { findMany: productFindMany },
      restaurantProduct: { findMany: restaurantProductFindMany },
      order: { upsert: orderUpsert },
      orderLine: { deleteMany: orderLineDeleteMany, createMany: orderLineCreateMany, findMany: orderLineFindMany },
      orderLineModifier: { deleteMany: orderLineModifierDeleteMany, createMany: orderLineModifierCreateMany },
      orderLineComboSlot: { deleteMany: orderLineComboSlotDeleteMany, createMany: orderLineComboSlotCreateMany },
      orderLinePlatterComponent: {
        deleteMany: orderLinePlatterComponentDeleteMany,
        createMany: orderLinePlatterComponentCreateMany,
      },
      orderDiscount: { deleteMany: orderDiscountDeleteMany, createMany: orderDiscountCreateMany },
      payment: { deleteMany: paymentDeleteMany, createMany: paymentCreateMany },
    } as unknown as PrismaClient;

    await seedMesaFlowOrdersDemo(prisma);

    expect(orderUpsert).toHaveBeenCalledTimes(3);
    expect(orderLineCreateMany).toHaveBeenNthCalledWith(1, {
      data: expect.arrayContaining([
        expect.objectContaining({
          orderId: 'order-demo-service',
          productNameSnapshot: 'Hamburguesa craft',
          status: 'preparing',
          configurationSignature: 'burger::cheese::sin-cebolla',
        }),
        expect.objectContaining({
          orderId: 'order-demo-service',
          productNameSnapshot: 'Menu Classic Burger',
          productTypeSnapshot: 'combo',
        }),
      ]),
    });
    expect(orderLineCreateMany).toHaveBeenNthCalledWith(2, {
      data: expect.arrayContaining([
        expect.objectContaining({
          orderId: 'order-demo-served',
          productNameSnapshot: 'Plato combinado vegetal',
          productTypeSnapshot: 'platter',
        }),
      ]),
    });
    expect(orderLineModifierCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          orderLineId: 'line-burger',
          groupNameSnapshot: 'Extras',
          optionNameSnapshot: 'Queso',
          priceDeltaCents: 100,
        }),
      ]),
    });
    expect(orderLineComboSlotCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          orderLineId: 'line-combo',
          slotNameSnapshot: 'Bebida',
          selectedProductNameSnapshot: 'Cerveza',
          supplementPriceCents: 150,
        }),
      ]),
    });
    expect(orderLinePlatterComponentCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          orderLineId: 'line-platter',
          componentNameSnapshot: 'Huevo',
          removed: true,
        }),
      ]),
    });
    expect(orderDiscountCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          orderId: 'order-demo-paid',
          type: 'percentage',
          value: '10.00',
          createdByUserId: 'user-manager',
        }),
      ]),
    });
    expect(paymentCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          orderId: 'order-demo-paid',
          method: 'cash',
          amountCents: 1071,
          status: 'completed',
        }),
      ]),
    });
  });
});
