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
      where: { orderId: 'order-1', status: { in: ['preparing', 'ready'] } },
      data: { status: 'served' },
    });
  });
});
