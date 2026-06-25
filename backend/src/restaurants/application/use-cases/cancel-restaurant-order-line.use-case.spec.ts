import { describe, expect, it, vi } from 'vitest';

import { applicationError } from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { err, ok } from '../../../shared/result/result';
import type { RestaurantOrderView } from '../../domain/restaurant-order.models';
import type { RestaurantOrderRepository } from '../ports/restaurant-order-repository.port';
import { CancelRestaurantOrderLineUseCase } from './cancel-restaurant-order-line.use-case';

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

describe('CancelRestaurantOrderLineUseCase', () => {
  it('delegates the cancel command to the repository and returns the updated order', async () => {
    const repository = makeRepository();
    const updatedOrder = makeOrder();
    vi.mocked(repository.cancelLine).mockResolvedValue(updatedOrder);
    const useCase = new CancelRestaurantOrderLineUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-1',
      orderId: 'order-1',
      lineId: 'line-1',
      reason: 'Cliente cambió de opinión',
    });

    expect(result).toEqual(ok(updatedOrder));
    expect(repository.cancelLine).toHaveBeenCalledWith({
      restaurantId: 'restaurant-1',
      orderId: 'order-1',
      lineId: 'line-1',
      reason: 'Cliente cambió de opinión',
    });
  });

  it('returns invalid_order_configuration when reason is blank', async () => {
    const repository = makeRepository();
    const useCase = new CancelRestaurantOrderLineUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-1',
      orderId: 'order-1',
      lineId: 'line-1',
      reason: '   ',
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_order_configuration' })));
    expect(repository.cancelLine).not.toHaveBeenCalled();
  });

  it('returns invalid_order_state when the line status does not allow cancellation', async () => {
    const repository = makeRepository();
    vi.mocked(repository.cancelLine).mockRejectedValue(
      new ApplicationErrorException(applicationError('invalid_order_state', 'Only preparing or ready lines can be cancelled.')),
    );
    const useCase = new CancelRestaurantOrderLineUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-1',
      orderId: 'order-1',
      lineId: 'line-served',
      reason: 'Error de comanda',
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_order_state' })));
  });

  it('returns order_line_not_found when the line does not exist', async () => {
    const repository = makeRepository();
    vi.mocked(repository.cancelLine).mockRejectedValue(
      new ApplicationErrorException(applicationError('order_line_not_found', 'Line not found.')),
    );
    const useCase = new CancelRestaurantOrderLineUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-1',
      orderId: 'order-1',
      lineId: 'line-missing',
      reason: 'Error de comanda',
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'order_line_not_found' })));
  });

  it('rethrows unexpected errors', async () => {
    const repository = makeRepository();
    vi.mocked(repository.cancelLine).mockRejectedValue(new Error('DB connection lost'));
    const useCase = new CancelRestaurantOrderLineUseCase(repository);

    await expect(
      useCase.execute({ restaurantId: 'restaurant-1', orderId: 'order-1', lineId: 'line-1', reason: 'Error' }),
    ).rejects.toThrow('DB connection lost');
  });
});
