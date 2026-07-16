import { describe, expect, it, vi } from 'vitest';

import { reservationNotFound } from '../../../shared/errors/application-error';
import type { RestaurantReadRepository } from '../ports/restaurant-read-repository.port';
import { GetRestaurantReservationUseCase } from './get-restaurant-reservation.use-case';

function makeReservation() {
  return {
    id: 'reservation-1',
    customerId: null,
    customerNameSnapshot: 'Laura Gomez',
    customerPhoneSnapshot: '+34 600 111 222',
    partySize: 2,
    reservationAt: '2026-06-27T11:30:00.000Z',
    durationMinutes: 90,
    status: 'confirmed' as const,
    notes: null,
    tableIds: ['table-1'],
    tables: [{ id: 'table-1', tableNumber: 1, name: 'Mesa 1' }],
    depositAmountCents: 1000,
    depositPaidAt: '2026-06-27T11:00:00.000Z',
  };
}

function makeRepository(): RestaurantReadRepository {
  return {
    listRestaurants: vi.fn(),
    findMenuByRestaurantId: vi.fn(),
    findFloorsByRestaurantId: vi.fn(),
    listReservationsByRestaurantId: vi.fn(),
    findReservationById: vi.fn(),
    findConflictingReservations: vi.fn(),
    findTableCapacity: vi.fn(),
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

describe('GetRestaurantReservationUseCase', () => {
  it('returns the reservation when it exists for the restaurant', async () => {
    const repository = makeRepository();
    const reservation = makeReservation();
    vi.mocked(repository.findReservationById).mockResolvedValue(reservation);
    const useCase = new GetRestaurantReservationUseCase(repository);

    const result = await useCase.execute('restaurant-mesaflow-centro', 'reservation-1');

    expect(result).toEqual({ ok: true, value: reservation });
    expect(repository.findReservationById).toHaveBeenCalledWith('restaurant-mesaflow-centro', 'reservation-1');
  });

  it('returns reservation_not_found when the reservation does not exist for the restaurant', async () => {
    const repository = makeRepository();
    vi.mocked(repository.findReservationById).mockResolvedValue(null);
    const useCase = new GetRestaurantReservationUseCase(repository);

    const result = await useCase.execute('restaurant-mesaflow-centro', 'missing');

    expect(result).toEqual({ ok: false, error: reservationNotFound('missing') });
  });
});
