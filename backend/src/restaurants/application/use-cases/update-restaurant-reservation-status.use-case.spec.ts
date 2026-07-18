import { describe, expect, it, vi } from 'vitest';

import { applicationError } from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { err, ok } from '../../../shared/result/result';
import type { RestaurantReadRepository } from '../ports/restaurant-read-repository.port';
import { UpdateRestaurantReservationStatusUseCase } from './update-restaurant-reservation-status.use-case';

function makeReservation(status: 'pending' | 'confirmed' | 'seated' | 'cancelled' | 'no_show' = 'pending') {
  return {
    id: 'reservation-1',
    customerId: 'customer-1',
    customerNameSnapshot: 'Laura Gomez',
    customerPhoneSnapshot: '+34 600 111 222',
    partySize: 2,
    reservationAt: '2026-06-27T13:30:00.000Z',
    durationMinutes: 90,
    status,
    notes: 'Mesa tranquila.',
    tableIds: ['table-1'],
    tables: [{ id: 'table-1', tableNumber: 1, name: 'Mesa 1' }],
    depositAmountCents: 1000,
    depositPaidAt: '2026-06-27T13:00:00.000Z',
  } as const;
}

function makeRepository(): RestaurantReadRepository {
  return {
    listRestaurants: vi.fn(),
    findMenuByRestaurantId: vi.fn(),
    findFloorsByRestaurantId: vi.fn(),
    listReservationsByRestaurantId: vi.fn(),
    findReservationById: vi.fn(),
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

describe('UpdateRestaurantReservationStatusUseCase', () => {
  it('updates the reservation status when the transition is allowed', async () => {
    const repository = makeRepository();
    vi.mocked(repository.listReservationsByRestaurantId).mockResolvedValue([makeReservation('pending')]);
    vi.mocked(repository.updateReservationStatus).mockResolvedValue(makeReservation('confirmed'));
    const useCase = new UpdateRestaurantReservationStatusUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-mesaflow-centro',
      reservationId: 'reservation-1',
      status: 'confirmed',
    });

    expect(result).toEqual(ok(makeReservation('confirmed')));
    expect(repository.updateReservationStatus).toHaveBeenCalledWith(
      'restaurant-mesaflow-centro',
      'reservation-1',
      'confirmed',
      null,
    );
  });

  it('returns restaurant_not_found when the restaurant does not exist', async () => {
    const repository = makeRepository();
    vi.mocked(repository.listReservationsByRestaurantId).mockResolvedValue(null);
    const useCase = new UpdateRestaurantReservationStatusUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-missing',
      reservationId: 'reservation-1',
      status: 'confirmed',
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'restaurant_not_found' })));
  });

  it('returns reservation_not_found when the reservation does not belong to the restaurant', async () => {
    const repository = makeRepository();
    vi.mocked(repository.listReservationsByRestaurantId).mockResolvedValue([makeReservation('pending')]);
    const useCase = new UpdateRestaurantReservationStatusUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-mesaflow-centro',
      reservationId: 'reservation-missing',
      status: 'confirmed',
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'reservation_not_found' })));
  });

  it('returns invalid_reservation_state when the repository rejects an invalid transition', async () => {
    const repository = makeRepository();
    vi.mocked(repository.listReservationsByRestaurantId).mockResolvedValue([makeReservation('confirmed')]);
    vi.mocked(repository.updateReservationStatus).mockRejectedValue(
      new ApplicationErrorException(
        applicationError('invalid_reservation_state', 'Reservation transition not allowed.'),
      ),
    );
    const useCase = new UpdateRestaurantReservationStatusUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-mesaflow-centro',
      reservationId: 'reservation-1',
      status: 'pending',
    });

    expect(result).toEqual(err(expect.objectContaining({ code: 'invalid_reservation_state' })));
  });
});
