import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../shared/result/result';
import type { RestaurantFloors } from '../../domain/restaurant-read.models';
import type { RestaurantOrderView } from '../../domain/restaurant-order.models';
import type { ServicePointDetailView } from '../../domain/service-floor.models';
import type { RestaurantReadRepository } from '../ports/restaurant-read-repository.port';
import type { RestaurantOrderRepository } from '../ports/restaurant-order-repository.port';
import { MarkRestaurantServicePointOrderServedUseCase } from './mark-restaurant-service-point-order-served.use-case';

function makeFloors(): RestaurantFloors {
  return {
    restaurantId: 'restaurant-1',
    tables: [{ id: 'table-1', tableNumber: 1, name: 'Mesa 1', capacity: 2, isActive: true }],
    floors: [],
  };
}

function makeServicePoint(): ServicePointDetailView {
  return {
    table: { id: 'table-1', tableNumber: 1, name: 'Mesa 1', capacity: 2, status: 'occupied', occupiedAt: null, serviceStartedAt: null },
    floorElement: null,
    serviceInfo: { lineCount: 1, guestCount: 2, totalCents: 1200, currency: 'EUR', servicePhase: { course: 'mains', status: 'in_progress' }, durationMinutes: 10 },
  };
}

function makeOrderWithActiveLines(): RestaurantOrderView {
  return {
    order: { id: 'order-1', restaurantId: 'restaurant-1', tableId: 'table-1', status: 'open', currency: 'EUR', guestCount: 2, subtotalCents: 1200, taxCents: 208, discountTotalCents: 0, totalCents: 1200, paidCents: 0, balanceCents: 1200, openedAt: '2026-06-24T10:00:00.000Z', updatedAt: '2026-06-24T10:00:00.000Z', closedAt: null },
    lines: [{ id: 'line-1', restaurantProductId: 'rp-1', productId: 'p-1', productName: 'Burger', productType: 'simple', course: 'main', preparationRoute: 'kitchen', basePriceCents: 1200, unitPriceCents: 1200, quantity: 1, subtotalCents: 1200, taxRateName: 'IVA', taxRatePercent: 21, taxCents: 208, status: 'preparing', kitchenNote: null, cancellationReason: null, cancelledAt: null, configurationSignature: 'rp-1||', modifiers: [], comboSlots: [], platterComponents: [] }],
    payments: [],
  };
}

function makeOrderWithAllServed(): RestaurantOrderView {
  return {
    order: { id: 'order-1', restaurantId: 'restaurant-1', tableId: 'table-1', status: 'open', currency: 'EUR', guestCount: 2, subtotalCents: 1200, taxCents: 208, discountTotalCents: 0, totalCents: 1200, paidCents: 0, balanceCents: 1200, openedAt: '2026-06-24T10:00:00.000Z', updatedAt: '2026-06-24T10:00:00.000Z', closedAt: null },
    lines: [{ id: 'line-1', restaurantProductId: 'rp-1', productId: 'p-1', productName: 'Burger', productType: 'simple', course: 'main', preparationRoute: 'kitchen', basePriceCents: 1200, unitPriceCents: 1200, quantity: 1, subtotalCents: 1200, taxRateName: 'IVA', taxRatePercent: 21, taxCents: 208, status: 'served', kitchenNote: null, cancellationReason: null, cancelledAt: null, configurationSignature: 'rp-1||', modifiers: [], comboSlots: [], platterComponents: [] }],
    payments: [],
  };
}

function makeReadRepository(): RestaurantReadRepository {
  return {
    listRestaurants: vi.fn(),
    findMenuByRestaurantId: vi.fn(),
    findFloorsByRestaurantId: vi.fn(),
    listReservationsByRestaurantId: vi.fn(),
    findServiceFloorByRestaurantId: vi.fn(),
    findServicePointByRestaurantId: vi.fn(),
    findServicePointOrderByRestaurantId: vi.fn(),
    occupyServicePoint: vi.fn(),
    sendServicePointOrderToKitchen: vi.fn(),
    markServicePointOrderServed: vi.fn(),
    chargeServicePoint: vi.fn(),
    setServicePointStatus: vi.fn(),
    reorderFloorElements: vi.fn(),
    updateFloor: vi.fn(),
    updateFloorElement: vi.fn(),
    createFloorElement: vi.fn(),
  } as unknown as RestaurantReadRepository;
}

function makeOrderRepository(): RestaurantOrderRepository {
  return {
    tableExists: vi.fn(),
    findActiveByTable: vi.fn(),
    findById: vi.fn(),
    open: vi.fn(),
    addLine: vi.fn(),
    updatePendingLine: vi.fn(),
    deletePendingLine: vi.fn(),
    cancelLine: vi.fn(),
    sendPendingLinesToKitchen: vi.fn(),
    markActiveLinesServed: vi.fn(),
    registerPayment: vi.fn(),
  };
}

describe('MarkRestaurantServicePointOrderServedUseCase', () => {
  it('calls markActiveLinesServed and updates table status when persistent order has active lines', async () => {
    const restaurants = makeReadRepository();
    const orders = makeOrderRepository();
    vi.mocked(restaurants.findFloorsByRestaurantId).mockResolvedValue(makeFloors());
    vi.mocked(orders.findActiveByTable).mockResolvedValue(makeOrderWithActiveLines());
    vi.mocked(orders.markActiveLinesServed).mockResolvedValue(makeOrderWithAllServed());
    vi.mocked(restaurants.setServicePointStatus).mockResolvedValue(makeServicePoint());
    const useCase = new MarkRestaurantServicePointOrderServedUseCase(restaurants, orders);

    const result = await useCase.execute('restaurant-1', 'table-1');

    expect(result).toEqual(ok(makeServicePoint()));
    expect(orders.markActiveLinesServed).toHaveBeenCalledWith('restaurant-1', 'table-1');
    expect(restaurants.setServicePointStatus).toHaveBeenCalledWith('restaurant-1', 'table-1', 'occupied');
    expect(restaurants.markServicePointOrderServed).not.toHaveBeenCalled();
  });

  it('returns invalid_service_action when persistent order has no active lines to serve', async () => {
    const restaurants = makeReadRepository();
    const orders = makeOrderRepository();
    vi.mocked(restaurants.findFloorsByRestaurantId).mockResolvedValue(makeFloors());
    vi.mocked(orders.findActiveByTable).mockResolvedValue(makeOrderWithAllServed());
    const useCase = new MarkRestaurantServicePointOrderServedUseCase(restaurants, orders);

    const result = await useCase.execute('restaurant-1', 'table-1');

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_service_action' })));
    expect(orders.markActiveLinesServed).not.toHaveBeenCalled();
  });

  it('falls back to demo path when no persistent order exists for the table', async () => {
    const restaurants = makeReadRepository();
    const orders = makeOrderRepository();
    const demoServicePoint = makeServicePoint();
    vi.mocked(restaurants.findFloorsByRestaurantId).mockResolvedValue(makeFloors());
    vi.mocked(orders.findActiveByTable).mockResolvedValue(null);
    vi.mocked(restaurants.findServicePointOrderByRestaurantId).mockResolvedValue({
      order: { id: 'demo-order', tableId: 'table-1', status: 'open', openedAt: '2026-06-24T10:00:00.000Z', updatedAt: '2026-06-24T10:00:00.000Z', subtotalCents: 1200, taxCents: 0, totalCents: 1200, currency: 'EUR' },
      lines: [{ id: 'l-1', productName: 'Burger', quantity: 1, unitPriceCents: 1200, subtotalCents: 1200, status: 'preparing', course: 'mains', kitchenNote: null }],
    });
    vi.mocked(restaurants.markServicePointOrderServed).mockResolvedValue(demoServicePoint);
    const useCase = new MarkRestaurantServicePointOrderServedUseCase(restaurants, orders);

    const result = await useCase.execute('restaurant-1', 'table-1');

    expect(result).toEqual(ok(demoServicePoint));
    expect(restaurants.markServicePointOrderServed).toHaveBeenCalledWith('restaurant-1', 'table-1');
    expect(orders.markActiveLinesServed).not.toHaveBeenCalled();
  });

  it('returns restaurant_not_found when restaurant does not exist', async () => {
    const restaurants = makeReadRepository();
    const orders = makeOrderRepository();
    vi.mocked(restaurants.findFloorsByRestaurantId).mockResolvedValue(null);
    const useCase = new MarkRestaurantServicePointOrderServedUseCase(restaurants, orders);

    const result = await useCase.execute('missing-restaurant', 'table-1');

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_not_found' })));
  });

  it('returns table_not_found when table does not exist in the restaurant', async () => {
    const restaurants = makeReadRepository();
    const orders = makeOrderRepository();
    vi.mocked(restaurants.findFloorsByRestaurantId).mockResolvedValue(makeFloors());
    const useCase = new MarkRestaurantServicePointOrderServedUseCase(restaurants, orders);

    const result = await useCase.execute('restaurant-1', 'missing-table');

    expect(result).toEqual(err(expect.objectContaining({ code: 'table_not_found' })));
  });
});
