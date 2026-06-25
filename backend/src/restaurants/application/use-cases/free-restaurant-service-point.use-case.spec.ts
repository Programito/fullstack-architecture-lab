import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../../shared/result/result';
import type { ServicePointDetailView } from '../../domain/service-floor.models';
import type { RestaurantReadRepository } from '../ports/restaurant-read-repository.port';
import { FreeRestaurantServicePointUseCase } from './free-restaurant-service-point.use-case';

function makeServicePoint(): ServicePointDetailView {
  return {
    table: { id: 'table-1', tableNumber: 1, name: null, capacity: 4, status: 'free', occupiedAt: null, serviceStartedAt: null },
    floorElement: null,
    serviceInfo: { lineCount: 0, guestCount: 0, totalCents: 0, currency: 'EUR', servicePhase: { course: 'drinks', status: 'no_order' }, durationMinutes: 0 },
  };
}

function makeRepository(): RestaurantReadRepository {
  return {
    listRestaurants: vi.fn(),
    findMenuByRestaurantId: vi.fn(),
    findFloorsByRestaurantId: vi.fn(async () => ({ restaurantId: 'restaurant-1', floors: [], tables: [{ id: 'table-1' }] } as any)),
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
  };
}

describe('FreeRestaurantServicePointUseCase', () => {
  it('sets the service point status to free and returns the updated service point', async () => {
    const repository = makeRepository();
    const servicePoint = makeServicePoint();
    vi.mocked(repository.setServicePointStatus).mockResolvedValue(servicePoint);
    const useCase = new FreeRestaurantServicePointUseCase(repository);

    const result = await useCase.execute('restaurant-1', 'table-1');

    expect(result).toEqual(ok(servicePoint));
    expect(repository.setServicePointStatus).toHaveBeenCalledWith('restaurant-1', 'table-1', 'free');
  });

  it('returns restaurant_not_found when the restaurant does not exist', async () => {
    const repository = makeRepository();
    vi.mocked(repository.findFloorsByRestaurantId).mockResolvedValue(null);
    const useCase = new FreeRestaurantServicePointUseCase(repository);

    const result = await useCase.execute('missing-restaurant', 'table-1');

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_not_found' })));
    expect(repository.setServicePointStatus).not.toHaveBeenCalled();
  });

  it('returns table_not_found when the table does not belong to the restaurant', async () => {
    const repository = makeRepository();
    const useCase = new FreeRestaurantServicePointUseCase(repository);

    const result = await useCase.execute('restaurant-1', 'table-unknown');

    expect(result).toEqual(err(expect.objectContaining({ code: 'table_not_found' })));
    expect(repository.setServicePointStatus).not.toHaveBeenCalled();
  });
});
