import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { AuthenticatedRequest } from '../../../identity/presentation/rest/auth.guard';
import type { AuditService } from '../../../observability/application/audit.service';
import { ok } from '../../../shared/result/result';
import type { RestaurantReservation } from '../../domain/restaurant-read.models';
import { RestaurantReservationsController } from './restaurant-reservations.controller';

const RESTAURANT_ID = 'restaurant-mesaflow-centro';

function makeReservation(): RestaurantReservation {
  return {
    id: 'reservation-1',
    customerId: null,
    customerNameSnapshot: 'Laura Gomez',
    customerPhoneSnapshot: '+34 600 111 222',
    partySize: 2,
    reservationAt: '2026-07-18T13:30:00.000Z',
    durationMinutes: 90,
    status: 'pending',
    notes: null,
    tableIds: [],
    tables: [],
    depositAmountCents: 1000,
    depositPaidAt: '2026-07-17T12:00:00.000Z',
    clientOrigin: 'web-pos',
  };
}

function makeRequest(origin?: 'web-pos' | 'apk-customer'): AuthenticatedRequest {
  return {
    headers: origin ? { 'x-client-origin': origin } : {},
    auth: {
      userId: 'user-1',
      sessionId: 'session-1',
      accountType: 'regular',
      roles: [],
      permissions: [],
      scopes: { organizations: [], restaurants: [RESTAURANT_ID] },
      restaurantPermissions: {},
      organizationPermissions: {},
    },
  } as unknown as AuthenticatedRequest;
}

function makeController() {
  const listRestaurantReservations = { execute: vi.fn() };
  const getRestaurantReservation = { execute: vi.fn() };
  const createRestaurantReservation = { execute: vi.fn() };
  const updateRestaurantReservationStatus = { execute: vi.fn() };
  const audit = { record: vi.fn().mockResolvedValue(undefined) } as unknown as AuditService;

  const controller = new RestaurantReservationsController(
    listRestaurantReservations as any,
    getRestaurantReservation as any,
    createRestaurantReservation as any,
    updateRestaurantReservationStatus as any,
    audit,
  );

  return {
    controller,
    createRestaurantReservation,
    audit,
  };
}

describe('RestaurantReservationsController', () => {
  it('defaults paymentMethod to other for backoffice reservations when omitted', async () => {
    const { controller, createRestaurantReservation } = makeController();
    createRestaurantReservation.execute.mockResolvedValue(ok(makeReservation()));

    await controller.createReservation(
      RESTAURANT_ID,
      {
        customerNameSnapshot: 'Laura Gomez',
        customerPhoneSnapshot: '+34 600 111 222',
        partySize: 2,
        reservationAt: '2026-07-18T13:30:00.000Z',
        durationMinutes: 90,
        notes: null,
        tableIds: [],
      },
      makeRequest('web-pos'),
    );

    expect(createRestaurantReservation.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethod: 'other',
        clientOrigin: 'web-pos',
      }),
    );
  });

  it('requires paymentMethod for apk-customer reservations', async () => {
    const { controller, createRestaurantReservation } = makeController();

    await expect(() =>
      controller.createReservation(
        RESTAURANT_ID,
        {
          customerNameSnapshot: 'Laura Gomez',
          customerPhoneSnapshot: '+34 600 111 222',
          partySize: 2,
          reservationAt: '2026-07-18T13:30:00.000Z',
          durationMinutes: 90,
          notes: null,
          tableIds: [],
        },
        makeRequest('apk-customer'),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(createRestaurantReservation.execute).not.toHaveBeenCalled();
  });
});
