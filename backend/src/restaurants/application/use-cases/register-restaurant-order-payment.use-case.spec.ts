import { describe, expect, it, vi } from 'vitest';

import { applicationError } from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { err, ok } from '../../../shared/result/result';
import type { RestaurantOrderView } from '../../domain/restaurant-order.models';
import type { RestaurantOrderRepository } from '../ports/restaurant-order-repository.port';
import { RegisterRestaurantOrderPaymentUseCase } from './register-restaurant-order-payment.use-case';

function makeOrderView(): RestaurantOrderView {
  return {
    order: { id: 'order-1', restaurantId: 'restaurant-1', tableId: 'table-1', status: 'paid', currency: 'EUR', guestCount: 2, subtotalCents: 1200, taxCents: 208, discountTotalCents: 0, totalCents: 1200, paidCents: 1200, balanceCents: 0, openedAt: '2026-06-24T10:00:00.000Z', updatedAt: '2026-06-24T10:01:00.000Z', closedAt: '2026-06-24T10:01:00.000Z' },
    lines: [],
    payments: [{ id: 'pay-1', method: 'card', amountCents: 1200, status: 'completed', paidAt: '2026-06-24T10:01:00.000Z' }],
  };
}

function makeRepo(): RestaurantOrderRepository {
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

describe('RegisterRestaurantOrderPaymentUseCase', () => {
  it('delegates to the repository and returns the updated order on success', async () => {
    const repo = makeRepo();
    vi.mocked(repo.registerPayment).mockResolvedValue(makeOrderView());
    const useCase = new RegisterRestaurantOrderPaymentUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'restaurant-1', orderId: 'order-1', amountCents: 1200, method: 'card' });

    expect(result).toEqual(ok(makeOrderView()));
    expect(repo.registerPayment).toHaveBeenCalledWith({ restaurantId: 'restaurant-1', orderId: 'order-1', amountCents: 1200, method: 'card' });
  });

  it('returns invalid_order_configuration when amountCents is zero', async () => {
    const repo = makeRepo();
    const useCase = new RegisterRestaurantOrderPaymentUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'restaurant-1', orderId: 'order-1', amountCents: 0, method: 'cash' });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_order_configuration' })));
    expect(repo.registerPayment).not.toHaveBeenCalled();
  });

  it('returns invalid_order_configuration when amountCents is negative', async () => {
    const repo = makeRepo();
    const useCase = new RegisterRestaurantOrderPaymentUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'restaurant-1', orderId: 'order-1', amountCents: -100, method: 'cash' });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_order_configuration' })));
    expect(repo.registerPayment).not.toHaveBeenCalled();
  });

  it('returns order_not_found when the repository throws order_not_found', async () => {
    const repo = makeRepo();
    vi.mocked(repo.registerPayment).mockRejectedValue(
      new ApplicationErrorException(applicationError('order_not_found', 'Order not found.', { orderId: 'order-1' })),
    );
    const useCase = new RegisterRestaurantOrderPaymentUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'restaurant-1', orderId: 'order-1', amountCents: 500, method: 'card' });

    expect(result).toEqual(err(expect.objectContaining({ code: 'order_not_found' })));
  });

  it('returns invalid_order_state when the repository throws invalid_order_state', async () => {
    const repo = makeRepo();
    vi.mocked(repo.registerPayment).mockRejectedValue(
      new ApplicationErrorException(applicationError('invalid_order_state', 'Order is already paid.')),
    );
    const useCase = new RegisterRestaurantOrderPaymentUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'restaurant-1', orderId: 'order-1', amountCents: 500, method: 'card' });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_order_state' })));
  });

  it('returns payment_exceeds_balance when the repository throws payment_exceeds_balance', async () => {
    const repo = makeRepo();
    vi.mocked(repo.registerPayment).mockRejectedValue(
      new ApplicationErrorException(applicationError('payment_exceeds_balance', 'Payment exceeds remaining balance.')),
    );
    const useCase = new RegisterRestaurantOrderPaymentUseCase(repo);

    const result = await useCase.execute({ restaurantId: 'restaurant-1', orderId: 'order-1', amountCents: 9999, method: 'card' });

    expect(result).toEqual(err(expect.objectContaining({ code: 'payment_exceeds_balance' })));
  });

  it('rethrows unexpected errors from the repository', async () => {
    const repo = makeRepo();
    const unexpected = new Error('Database connection lost');
    vi.mocked(repo.registerPayment).mockRejectedValue(unexpected);
    const useCase = new RegisterRestaurantOrderPaymentUseCase(repo);

    await expect(useCase.execute({ restaurantId: 'restaurant-1', orderId: 'order-1', amountCents: 500, method: 'card' })).rejects.toThrow(
      'Database connection lost',
    );
  });
});
