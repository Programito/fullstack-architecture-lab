import { describe, expect, it } from 'vitest';

import { DemoRestaurantReadRepository } from './demo-restaurant-read.repository';

describe('DemoRestaurantReadRepository', () => {
  it('returns reservations sorted by time and enriched with readable table data', async () => {
    const repository = new DemoRestaurantReadRepository();

    const reservations = await repository.listReservationsByRestaurantId('restaurant-mesaflow-centro');

    expect(reservations).toBeTruthy();
    expect(reservations?.map((reservation) => reservation.id)).toEqual([
      'reservation-demo-lunch',
      'reservation-demo-group',
    ]);
    expect(reservations?.[0]?.tables).toEqual([
      { id: 'table-1', tableNumber: 1, name: 'Mesa 1' },
    ]);
    expect(reservations?.[1]?.tables).toEqual([
      { id: 'table-3', tableNumber: 3, name: 'Mesa 3' },
      { id: 'table-4', tableNumber: 4, name: 'Mesa 4' },
    ]);
  });

  it('updates one reservation status when the transition is allowed', async () => {
    const repository = new DemoRestaurantReadRepository();

    const updated = await repository.updateReservationStatus(
      'restaurant-mesaflow-centro',
      'reservation-demo-group',
      'confirmed',
    );

    expect(updated).toEqual(
      expect.objectContaining({
        id: 'reservation-demo-group',
        status: 'confirmed',
      }),
    );

    const reservations = await repository.listReservationsByRestaurantId('restaurant-mesaflow-centro');
    expect(reservations?.find((reservation) => reservation.id === 'reservation-demo-group')?.status).toBe('confirmed');
  });

  it('creates a pending reservation sorted in the agenda', async () => {
    const repository = new DemoRestaurantReadRepository();

    const created = await repository.createReservation('restaurant-mesaflow-centro', {
      customerNameSnapshot: 'Marina Soler',
      customerPhoneSnapshot: '+34 600 777 888',
      partySize: 4,
      reservationAt: '2026-06-21T14:00:00.000Z',
      durationMinutes: 90,
      notes: 'Ventana',
      tableIds: ['table-1'],
    });

    expect(created).toEqual(
      expect.objectContaining({
        customerId: null,
        customerNameSnapshot: 'Marina Soler',
        customerPhoneSnapshot: '+34 600 777 888',
        partySize: 4,
        reservationAt: '2026-06-21T14:00:00.000Z',
        durationMinutes: 90,
        status: 'pending',
        notes: 'Ventana',
        tableIds: ['table-1'],
        tables: [{ id: 'table-1', tableNumber: 1, name: 'Mesa 1' }],
      }),
    );

    const reservations = await repository.listReservationsByRestaurantId('restaurant-mesaflow-centro');
    expect(reservations?.map((reservation) => reservation.id)).toEqual([
      'reservation-demo-lunch',
      expect.stringMatching(/^reservation-/),
      'reservation-demo-group',
    ]);
  });

  it('throws when a new reservation references tables outside the restaurant', async () => {
    const repository = new DemoRestaurantReadRepository();

    await expect(
      repository.createReservation('restaurant-mesaflow-centro', {
        customerNameSnapshot: 'Marina Soler',
        customerPhoneSnapshot: null,
        partySize: 4,
        reservationAt: '2026-06-21T14:00:00.000Z',
        durationMinutes: 90,
        notes: null,
        tableIds: ['missing-table'],
      }),
    ).rejects.toMatchObject({
      applicationError: expect.objectContaining({
        code: 'invalid_reservation_creation',
      }),
    });
  });

  it('throws when the reservation transition is not allowed', async () => {
    const repository = new DemoRestaurantReadRepository();

    await expect(
      repository.updateReservationStatus('restaurant-mesaflow-centro', 'reservation-demo-lunch', 'pending'),
    ).rejects.toMatchObject({
      applicationError: expect.objectContaining({
        code: 'invalid_reservation_state',
      }),
    });
  });
});
