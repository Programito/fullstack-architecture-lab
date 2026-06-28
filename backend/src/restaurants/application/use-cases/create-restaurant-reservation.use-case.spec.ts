import { describe, expect, it, vi } from 'vitest';

import { invalidReservationCreation, invalidReservationState, restaurantNotFound } from '../../../shared/errors/application-error';
import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import type { RestaurantReadRepository } from '../ports/restaurant-read-repository.port';
import { CreateRestaurantReservationUseCase } from './create-restaurant-reservation.use-case';

const RESERVATION_AT = '2026-06-28T13:30:00.000Z';

function makeReservation() {
  return {
    id: 'reservation-created',
    customerId: null,
    customerNameSnapshot: 'Laura Gomez',
    customerPhoneSnapshot: '+34 600 111 222',
    partySize: 2,
    reservationAt: RESERVATION_AT,
    durationMinutes: 90,
    status: 'pending' as const,
    notes: 'Ventana',
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

describe('CreateRestaurantReservationUseCase', () => {
  it('creates one reservation with snapshots and optional table ids', async () => {
    const repository = makeRepository();
    vi.mocked(repository.createReservation).mockResolvedValue(makeReservation());
    const useCase = new CreateRestaurantReservationUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-mesaflow-centro',
      customerNameSnapshot: ' Laura Gomez ',
      customerPhoneSnapshot: ' +34 600 111 222 ',
      partySize: 2,
      reservationAt: RESERVATION_AT,
      durationMinutes: 90,
      notes: ' Ventana ',
      tableIds: ['table-1'],
    });

    expect(result).toEqual({ ok: true, value: makeReservation() });
    expect(repository.createReservation).toHaveBeenCalledWith('restaurant-mesaflow-centro', {
      customerNameSnapshot: 'Laura Gomez',
      customerPhoneSnapshot: '+34 600 111 222',
      partySize: 2,
      reservationAt: RESERVATION_AT,
      durationMinutes: 90,
      notes: 'Ventana',
      tableIds: ['table-1'],
    });
  });

  it('returns restaurant_not_found when the restaurant does not exist', async () => {
    const repository = makeRepository();
    vi.mocked(repository.createReservation).mockResolvedValue(null);
    const useCase = new CreateRestaurantReservationUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'missing',
      customerNameSnapshot: 'Laura Gomez',
      customerPhoneSnapshot: '+34 600 111 222',
      partySize: 2,
      reservationAt: RESERVATION_AT,
      durationMinutes: 90,
      notes: null,
      tableIds: [],
    });

    expect(result).toEqual({ ok: false, error: restaurantNotFound('missing') });
  });

  it('rejects party size lower than 1', async () => {
    const repository = makeRepository();
    const useCase = new CreateRestaurantReservationUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-mesaflow-centro',
      customerNameSnapshot: 'Laura Gomez',
      customerPhoneSnapshot: null,
      partySize: 0,
      reservationAt: RESERVATION_AT,
      durationMinutes: 90,
      notes: null,
      tableIds: [],
    });

    expect(result).toEqual({
      ok: false,
      error: invalidReservationCreation({ reason: 'invalid_party_size' }),
    });
  });

  it('returns repository application errors such as invalid table ownership', async () => {
    const repository = makeRepository();
    vi.mocked(repository.createReservation).mockRejectedValue(
      new ApplicationErrorException(invalidReservationState({ reason: 'invalid_table_ids' })),
    );
    const useCase = new CreateRestaurantReservationUseCase(repository);

    const result = await useCase.execute({
      restaurantId: 'restaurant-mesaflow-centro',
      customerNameSnapshot: 'Laura Gomez',
      customerPhoneSnapshot: null,
      partySize: 2,
      reservationAt: RESERVATION_AT,
      durationMinutes: 90,
      notes: null,
      tableIds: ['missing-table'],
    });

    expect(result).toEqual({
      ok: false,
      error: invalidReservationState({ reason: 'invalid_table_ids' }),
    });
  });
});
