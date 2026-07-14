import { describe, expect, it, vi } from 'vitest';

import { restaurantNotFound } from '../../../shared/errors/application-error';
import type { RestaurantReadRepository } from '../ports/restaurant-read-repository.port';
import { ListRestaurantReservationsUseCase } from './list-restaurant-reservations.use-case';

function makeReservation(overrides: { reservationAt?: string } = {}) {
  return {
    id: 'reservation-1',
    customerId: null,
    customerNameSnapshot: 'Laura Gomez',
    customerPhoneSnapshot: '+34 600 111 222',
    partySize: 2,
    reservationAt: overrides.reservationAt ?? '2026-06-27T11:30:00.000Z',
    durationMinutes: 90,
    status: 'confirmed' as const,
    notes: null,
    tableIds: ['table-1'],
    tables: [{ id: 'table-1', tableNumber: 1, name: 'Mesa 1' }],
  };
}

function makeRepository(): RestaurantReadRepository {
  return {
    listRestaurants: vi.fn(),
    findMenuByRestaurantId: vi.fn(),
    findFloorsByRestaurantId: vi.fn(),
    listReservationsByRestaurantId: vi.fn(),
    createReservation: vi.fn(),
    updateReservationStatus: vi.fn(),
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
    updateServiceOrderLineStatus: vi.fn(),
    createFloorElement: vi.fn(),
  };
}

describe('ListRestaurantReservationsUseCase', () => {
  it('returns all reservations when no date is given', async () => {
    const repository = makeRepository();
    const reservations = [makeReservation(), makeReservation({ reservationAt: '2026-06-28T20:00:00.000Z' })];
    vi.mocked(repository.listReservationsByRestaurantId).mockResolvedValue(reservations);
    const useCase = new ListRestaurantReservationsUseCase(repository);

    const result = await useCase.execute('restaurant-mesaflow-centro');

    expect(result).toEqual({ ok: true, value: reservations });
    expect(repository.listReservationsByRestaurantId).toHaveBeenCalledWith('restaurant-mesaflow-centro', undefined);
  });

  it('forwards the date filter to the repository', async () => {
    const repository = makeRepository();
    const reservations = [makeReservation()];
    vi.mocked(repository.listReservationsByRestaurantId).mockResolvedValue(reservations);
    const useCase = new ListRestaurantReservationsUseCase(repository);

    const result = await useCase.execute('restaurant-mesaflow-centro', '2026-06-27');

    expect(result).toEqual({ ok: true, value: reservations });
    expect(repository.listReservationsByRestaurantId).toHaveBeenCalledWith('restaurant-mesaflow-centro', '2026-06-27');
  });

  it('returns restaurant_not_found when the restaurant does not exist', async () => {
    const repository = makeRepository();
    vi.mocked(repository.listReservationsByRestaurantId).mockResolvedValue(null);
    const useCase = new ListRestaurantReservationsUseCase(repository);

    const result = await useCase.execute('missing');

    expect(result).toEqual({ ok: false, error: restaurantNotFound('missing') });
  });
});
