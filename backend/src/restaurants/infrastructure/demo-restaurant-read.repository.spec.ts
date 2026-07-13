import { describe, expect, it } from 'vitest';

import { DemoRestaurantReadRepository } from './demo-restaurant-read.repository';

describe('DemoRestaurantReadRepository', () => {
  it('returns multilingual menu content for customer-facing demo items and modifiers', async () => {
    const repository = new DemoRestaurantReadRepository();

    const menu = await repository.findMenuByRestaurantId('restaurant-mesaflow-centro');

    const drinksSection = menu?.sections.find((section) => section.id === 'menu-section-drinks');
    const coke = drinksSection?.items.find((item) => item.id === 'menu-item-coke');
    const drinkSizeGroup = coke?.modifierGroups?.find((group) => group.name === 'Tamaño de bebida');

    expect(drinksSection?.nameI18n).toEqual({
      es: 'Bebidas',
      ca: 'Begudes',
      en: 'Drinks',
    });
    expect(coke?.nameI18n).toEqual({
      es: 'Coca-Cola',
      ca: 'Coca-Cola',
      en: 'Coke',
    });
    expect(drinkSizeGroup?.nameI18n).toEqual({
      es: 'Tamaño de bebida',
      ca: 'Mida de beguda',
      en: 'Drink size',
    });
    expect(drinkSizeGroup?.options.map((option) => option.nameI18n)).toEqual([
      { es: 'Mediana', ca: 'Mitjana', en: 'Medium' },
      { es: 'Grande', ca: 'Gran', en: 'Large' },
      { es: 'XL', ca: 'XL', en: 'XL' },
    ]);
  });

  it('returns nothing when the caller has no restaurant or organization scope', async () => {
    const repository = new DemoRestaurantReadRepository();

    const restaurants = await repository.listRestaurants([], []);

    expect(restaurants).toEqual([]);
  });

  it('returns restaurants matching an explicit restaurant scope', async () => {
    const repository = new DemoRestaurantReadRepository();

    const restaurants = await repository.listRestaurants(['restaurant-mesaflow-centro'], []);

    expect(restaurants.map((r) => r.id)).toEqual(['restaurant-mesaflow-centro']);
  });

  it('returns restaurants belonging to an organization in scope, and none from other organizations', async () => {
    const repository = new DemoRestaurantReadRepository();

    const ownOrgRestaurants = await repository.listRestaurants([], ['org-demo']);
    const otherOrgRestaurants = await repository.listRestaurants([], ['org-other-tenant']);

    expect(ownOrgRestaurants.map((r) => r.id)).toEqual(['restaurant-mesaflow-centro']);
    expect(otherOrgRestaurants.map((r) => r.id)).toEqual(['restaurant-other-tenant']);
  });

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
