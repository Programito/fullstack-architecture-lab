import { describe, expect, it, vi } from 'vitest';

import { PrismaRestaurantOrderRepository } from './prisma-restaurant-order.repository';

function makeRepository() {
  const prisma = {
    order: { findFirst: vi.fn().mockResolvedValue({ id: 'order-1' }) },
    orderLine: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
  const repository = new PrismaRestaurantOrderRepository(prisma as never);
  vi.spyOn(repository, 'findById').mockResolvedValue(null);

  return { prisma, repository };
}

describe('PrismaRestaurantOrderRepository.markActiveLinesServed', () => {
  it('limits selected serving to pending, preparing, or ready line IDs', async () => {
    const { prisma, repository } = makeRepository();

    await repository.markActiveLinesServed('restaurant-1', 'table-1', ['line-2']);

    expect(prisma.orderLine.updateMany).toHaveBeenCalledWith({
      where: { orderId: 'order-1', id: { in: ['line-2'] }, status: { in: ['pending', 'preparing', 'ready'] } },
      data: { status: 'served' },
    });
  });

  it('serves all eligible lines when line IDs are omitted or empty', async () => {
    const { prisma, repository } = makeRepository();

    await repository.markActiveLinesServed('restaurant-1', 'table-1', []);

    expect(prisma.orderLine.updateMany).toHaveBeenCalledWith({
      where: {
        orderId: 'order-1',
        OR: [
          { status: { in: ['preparing', 'ready'] } },
          { status: 'pending', sentToKitchenAt: { not: null } },
        ],
      },
      data: { status: 'served' },
    });
  });
});

describe('PrismaRestaurantOrderRepository order image contract', () => {
  it('preserves the current product image URL and returns null when the relation is absent', async () => {
    const prisma = {
      order: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'order-1',
          dailyNumber: 1,
          restaurantId: 'restaurant-1',
          tableId: 'table-1',
          status: 'open',
          currency: 'EUR',
          guestCount: 2,
          subtotalCents: 1500,
          taxCents: 260,
          discountTotalCents: 0,
          totalCents: 1500,
          closedAt: null,
          clientOrigin: null,
          createdAt: new Date('2026-07-18T12:00:00.000Z'),
          updatedAt: new Date('2026-07-18T12:00:00.000Z'),
          payments: [],
          lines: [
            {
              id: 'line-with-image', restaurantProductId: 'rp-wine', productId: 'product-wine',
              productNameSnapshot: 'Wine', productTypeSnapshot: 'simple', courseSnapshot: 'drinks', preparationRouteSnapshot: 'bar',
              basePriceCentsSnapshot: 900, unitPriceCents: 900, quantity: 1, subtotalCents: 900,
              taxRateNameSnapshot: null, taxRatePercentSnapshot: null, taxCents: 0, status: 'pending', sentToKitchenAt: null,
              kitchenNote: null, cancellationReason: null, cancelledAt: null, configurationSignature: 'rp-wine|',
              modifiers: [], comboSlots: [], platterComponents: [],
              restaurantProduct: { imageUrl: 'https://cdn.example.test/wine.jpg' },
            },
            {
              id: 'line-without-relation', restaurantProductId: null, productId: null,
              productNameSnapshot: 'Legacy', productTypeSnapshot: 'simple', courseSnapshot: 'other', preparationRouteSnapshot: 'direct',
              basePriceCentsSnapshot: 600, unitPriceCents: 600, quantity: 1, subtotalCents: 600,
              taxRateNameSnapshot: null, taxRatePercentSnapshot: null, taxCents: 0, status: 'pending', sentToKitchenAt: null,
              kitchenNote: null, cancellationReason: null, cancelledAt: null, configurationSignature: 'legacy|',
              modifiers: [], comboSlots: [], platterComponents: [], restaurantProduct: null,
            },
          ],
        }),
      },
    };
    const repository = new PrismaRestaurantOrderRepository(prisma as never);

    const order = await repository.findById('restaurant-1', 'order-1');

    expect(order?.lines).toMatchObject([
      { id: 'line-with-image', imageUrl: 'https://cdn.example.test/wine.jpg' },
      { id: 'line-without-relation', imageUrl: null },
    ]);
    expect(prisma.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          lines: expect.objectContaining({
            include: expect.objectContaining({
              restaurantProduct: { select: { imageUrl: true } },
            }),
          }),
        }),
      }),
    );
  });
});
