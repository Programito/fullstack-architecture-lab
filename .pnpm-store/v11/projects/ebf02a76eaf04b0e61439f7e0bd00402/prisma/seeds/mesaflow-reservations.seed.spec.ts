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
    const customerFindFirst = vi.fn().mockResolvedValue(null);
    const customerCreate = vi
      .fn()
      .mockResolvedValueOnce({ id: 'customer-laura', name: 'Laura Gomez', phone: '+34 600 111 222' })
      .mockResolvedValueOnce({ id: 'customer-diego', name: 'Diego Martin', phone: '+34 600 333 444' })
      .mockResolvedValueOnce({ id: 'customer-ana', name: 'Ana Ruiz', phone: '+34 600 555 666' })
      .mockResolvedValueOnce({ id: 'customer-sergio', name: 'Sergio Lopez', phone: '+34 600 777 888' });
    const reservationUpsert = vi
      .fn()
      .mockResolvedValueOnce({ id: 'reservation-lunch' })
      .mockResolvedValueOnce({ id: 'reservation-group' })
      .mockResolvedValueOnce({ id: 'reservation-seated' })
      .mockResolvedValueOnce({ id: 'reservation-no-show' });
    const reservationTableDeleteMany = vi.fn().mockResolvedValue(undefined);
    const reservationTableCreateMany = vi.fn().mockResolvedValue(undefined);
    const prisma = {
      organization: { findUnique: organizationFindUnique },
      restaurant: { findFirst: restaurantFindFirst },
      restaurantTable: { findMany: restaurantTableFindMany },
      customer: { findFirst: customerFindFirst, create: customerCreate },
      reservation: { upsert: reservationUpsert },
      reservationTable: { deleteMany: reservationTableDeleteMany, createMany: reservationTableCreateMany },
    } as unknown as PrismaClient;

    await seedMesaFlowReservationsDemo(prisma);

    expect(customerFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org-demo', name: 'Laura Gomez' },
      }),
    );
    expect(customerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-demo',
          name: 'Laura Gomez',
          email: 'laura.gomez@example.com',
        }),
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
    expect(reservationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          customerNameSnapshot: 'Ana Ruiz',
          status: 'seated',
        }),
      }),
    );
    expect(reservationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          customerNameSnapshot: 'Sergio Lopez',
          status: 'no_show',
        }),
      }),
    );
    expect(reservationTableDeleteMany).toHaveBeenCalledTimes(4);
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
    expect(reservationTableCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          reservationId: 'reservation-seated',
          tableId: 'table-2',
        }),
      ]),
    });
    expect(reservationTableCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          reservationId: 'reservation-no-show',
          tableId: 'table-4',
        }),
      ]),
    });
  });
});
