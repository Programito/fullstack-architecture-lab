import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../shared/result/result';
import type { RestaurantOrderView } from '../../domain/restaurant-order.models';
import type { RestaurantOrderRepository } from '../ports/restaurant-order-repository.port';
import { OpenRestaurantOrderUseCase } from './open-restaurant-order.use-case';

function makeOrder(overrides: Partial<RestaurantOrderView['order']> = {}): RestaurantOrderView {
  return {
    order: {
      id: 'order-1',
      restaurantId: 'restaurant-1',
      tableId: 'table-1',
      status: 'open',
      currency: 'EUR',
      guestCount: 2,
      subtotalCents: 0,
      taxCents: 0,
      discountTotalCents: 0,
      totalCents: 0,
      paidCents: 0,
      balanceCents: 0,
      openedAt: '2026-06-24T10:00:00.000Z',
      updatedAt: '2026-06-24T10:00:00.000Z',
      closedAt: null,
      ...overrides,
    },
    lines: [],
    payments: [],
  };
}

function makeRepository(): RestaurantOrderRepository {
  return {
    tableExists: vi.fn(),
    findActiveByTable: vi.fn(),
    findById: vi.fn(),
    open: vi.fn(),
    addLine: vi.fn(),
    updatePendingLine: vi.fn(),
    deletePendingLine: vi.fn(),
    cancelLine: vi.fn(),
    updateLineStatus: vi.fn(),
    sendPendingLinesToKitchen: vi.fn(),
    markActiveLinesServed: vi.fn(),
    registerPayment: vi.fn(),
  };
}

describe('OpenRestaurantOrderUseCase', () => {
  it('returns the existing active order without creating another', async () => {
    const repository = makeRepository();
    const existingOrder = makeOrder();
    vi.mocked(repository.tableExists).mockResolvedValue(true);
    vi.mocked(repository.findActiveByTable).mockResolvedValue(existingOrder);
    const useCase = new OpenRestaurantOrderUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-1',
      tableId: 'table-1',
      openedByUserId: 'user-1',
      guestCount: 2,
    });

    expect(result).toEqual(ok({ order: existingOrder, created: false }));
    expect(repository.open).not.toHaveBeenCalled();
  });

  it('opens and returns a new order when no active order exists', async () => {
    const repository = makeRepository();
    const newOrder = makeOrder({ id: 'order-new' });
    vi.mocked(repository.tableExists).mockResolvedValue(true);
    vi.mocked(repository.findActiveByTable).mockResolvedValue(null);
    vi.mocked(repository.open).mockResolvedValue(newOrder);
    const useCase = new OpenRestaurantOrderUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-1',
      tableId: 'table-1',
      openedByUserId: 'user-1',
      guestCount: 2,
    });

    expect(result).toEqual(ok({ order: newOrder, created: true }));
    expect(repository.open).toHaveBeenCalledWith({
      restaurantId: 'restaurant-1',
      tableId: 'table-1',
      openedByUserId: 'user-1',
      guestCount: 2,
    });
  });

  it('returns table_not_found when the table does not exist in the restaurant', async () => {
    const repository = makeRepository();
    vi.mocked(repository.tableExists).mockResolvedValue(false);
    const useCase = new OpenRestaurantOrderUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-missing',
      tableId: 'table-1',
      openedByUserId: 'user-1',
      guestCount: 2,
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'table_not_found' })));
    expect(repository.findActiveByTable).not.toHaveBeenCalled();
    expect(repository.open).not.toHaveBeenCalled();
  });

  it('returns invalid_order_configuration when guestCount is not positive', async () => {
    const repository = makeRepository();
    vi.mocked(repository.tableExists).mockResolvedValue(true);
    const useCase = new OpenRestaurantOrderUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-1',
      tableId: 'table-1',
      openedByUserId: 'user-1',
      guestCount: 0,
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_order_configuration' })));
    expect(repository.open).not.toHaveBeenCalled();
  });

  it('recovers from a concurrent open by re-reading the winning active order', async () => {
    const repository = makeRepository();
    const concurrentOrder = makeOrder({ id: 'order-concurrent' });
    const conflictError = Object.assign(new Error('Unique constraint failed on index'), { code: 'P2002' });
    vi.mocked(repository.tableExists).mockResolvedValue(true);
    vi.mocked(repository.findActiveByTable)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(concurrentOrder);
    vi.mocked(repository.open).mockRejectedValue(conflictError);
    const useCase = new OpenRestaurantOrderUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-1',
      tableId: 'table-1',
      openedByUserId: 'user-1',
      guestCount: 2,
    });

    expect(result).toEqual(ok({ order: concurrentOrder, created: false }));
  });
});
