import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { seedMesaFlowReservationsDemo } from './mesaflow-reservations.seed';

describe('seedMesaFlowReservationsDemo', () => {
  it('creates customers, reservations with snapshots, and links them to one or more restaurant tables', async () => {
    const organizationFindUnique = vi.fn().mockResolvedValue({ id: 'org-demo' });
    const restaurantFindFirst = vi.fn().mockResolvedValue({ id: 'rest-demo', organizationId: 'org-demo' });
    const restaurantTableFindMany = vi.fn().mockResolvedValue([
      { id: 'table-1', tableNumber: 1 },
      { id: 'table-2', tableNumber: 2 },
      { id: 'table-3', tableNumber: 3 },
      { id: 'table-4', tableNumber: 4 },
    ]);
    const customerUpsert = vi
      .fn()
      .mockResolvedValueOnce({ id: 'customer-laura', name: 'Laura Gomez', phone: '+34 600 111 222' })
      .mockResolvedValueOnce({ id: 'customer-diego', name: 'Diego Martin', phone: '+34 600 333 444' });
    const reservationUpsert = vi
      .fn()
      .mockResolvedValueOnce({ id: 'reservation-lunch' })
      .mockResolvedValueOnce({ id: 'reservation-group' });
    const reservationTableDeleteMany = vi.fn().mockResolvedValue(undefined);
    const reservationTableCreateMany = vi.fn().mockResolvedValue(undefined);
    const prisma = {
      organization: { findUnique: organizationFindUnique },
      restaurant: { findFirst: restaurantFindFirst },
      restaurantTable: { findMany: restaurantTableFindMany },
      customer: { upsert: customerUpsert },
      reservation: { upsert: reservationUpsert },
      reservationTable: { deleteMany: reservationTableDeleteMany, createMany: reservationTableCreateMany },
    } as unknown as PrismaClient;

    await seedMesaFlowReservationsDemo(prisma);

    expect(customerUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId_name: {
            organizationId: 'org-demo',
            name: 'Laura Gomez',
          },
        },
      }),
    );
    expect(reservationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          customerNameSnapshot: 'Laura Gomez',
          customerPhoneSnapshot: '+34 600 111 222',
          partySize: 2,
          status: 'confirmed',
        }),
      }),
    );
    expect(reservationTableDeleteMany).toHaveBeenCalledTimes(2);
    expect(reservationTableCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          reservationId: 'reservation-lunch',
          tableId: 'table-1',
        }),
      ]),
    });
    expect(reservationTableCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          reservationId: 'reservation-group',
          tableId: 'table-3',
        }),
        expect.objectContaining({
          reservationId: 'reservation-group',
          tableId: 'table-4',
        }),
      ]),
    });
  });
});
