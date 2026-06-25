import { describe, expect, it, vi } from 'vitest';

import { applicationError } from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { err, ok } from '../../../shared/result/result';
import type { RestaurantOrderView } from '../../domain/restaurant-order.models';
import type { RestaurantOrderRepository } from '../ports/restaurant-order-repository.port';
import { AddRestaurantOrderLineUseCase } from './add-restaurant-order-line.use-case';

function makeOrder(): RestaurantOrderView {
  return {
    order: {
      id: 'order-1',
      restaurantId: 'restaurant-1',
      tableId: 'table-1',
      status: 'open',
      currency: 'EUR',
      guestCount: 2,
      subtotalCents: 1200,
      taxCents: 208,
      discountTotalCents: 0,
      totalCents: 1200,
      paidCents: 0,
      balanceCents: 1200,
      openedAt: '2026-06-24T10:00:00.000Z',
      updatedAt: '2026-06-24T10:00:00.000Z',
      closedAt: null,
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

describe('AddRestaurantOrderLineUseCase', () => {
  it('passes a simple product command to the repository', async () => {
    const repository = makeRepository();
    const updatedOrder = makeOrder();
    vi.mocked(repository.addLine).mockResolvedValue(updatedOrder);
    const useCase = new AddRestaurantOrderLineUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-1',
      orderId: 'order-1',
      restaurantProductId: 'sale-burger',
      quantity: 2,
      kitchenNote: 'Sin cebolla',
      modifiers: [],
      comboSlots: [],
      platterComponents: [],
    });

    expect(result).toEqual(ok(updatedOrder));
    expect(repository.addLine).toHaveBeenCalledWith({
      restaurantId: 'restaurant-1',
      orderId: 'order-1',
      restaurantProductId: 'sale-burger',
      quantity: 2,
      kitchenNote: 'Sin cebolla',
      modifiers: [],
      comboSlots: [],
      platterComponents: [],
    });
  });

  it('passes configured product with modifiers to the repository', async () => {
    const repository = makeRepository();
    vi.mocked(repository.addLine).mockResolvedValue(makeOrder());
    const useCase = new AddRestaurantOrderLineUseCase(repository);

    await useCase.execute({
      restaurantId: 'restaurant-1',
      orderId: 'order-1',
      restaurantProductId: 'sale-burger',
      quantity: 1,
      kitchenNote: null,
      modifiers: [{ modifierGroupId: 'extras', modifierOptionId: 'cheese', quantity: 1 }],
      comboSlots: [],
      platterComponents: [],
    });

    expect(repository.addLine).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantProductId: 'sale-burger',
        quantity: 1,
        modifiers: [{ modifierGroupId: 'extras', modifierOptionId: 'cheese', quantity: 1 }],
      }),
    );
  });

  it('returns invalid_order_configuration when quantity is not positive', async () => {
    const repository = makeRepository();
    const useCase = new AddRestaurantOrderLineUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-1',
      orderId: 'order-1',
      restaurantProductId: 'sale-burger',
      quantity: 0,
      kitchenNote: null,
      modifiers: [],
      comboSlots: [],
      platterComponents: [],
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_order_configuration' })));
    expect(repository.addLine).not.toHaveBeenCalled();
  });

  it('returns restaurant_product_not_found when the product does not belong to the restaurant', async () => {
    const repository = makeRepository();
    vi.mocked(repository.addLine).mockRejectedValue(
      new ApplicationErrorException(applicationError('restaurant_product_not_found', 'Product not found.')),
    );
    const useCase = new AddRestaurantOrderLineUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-1',
      orderId: 'order-1',
      restaurantProductId: 'sale-other-restaurant',
      quantity: 1,
      kitchenNote: null,
      modifiers: [],
      comboSlots: [],
      platterComponents: [],
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_product_not_found' })));
  });

  it('returns invalid_order_state when the order has a completed payment', async () => {
    const repository = makeRepository();
    vi.mocked(repository.addLine).mockRejectedValue(
      new ApplicationErrorException(applicationError('invalid_order_state', 'Order cannot be modified after a completed payment.')),
    );
    const useCase = new AddRestaurantOrderLineUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-1',
      orderId: 'order-paid',
      restaurantProductId: 'sale-burger',
      quantity: 1,
      kitchenNote: null,
      modifiers: [],
      comboSlots: [],
      platterComponents: [],
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_order_state' })));
  });
});
