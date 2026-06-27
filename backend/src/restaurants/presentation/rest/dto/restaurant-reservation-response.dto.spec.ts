import { describe, expect, it } from 'vitest';

import { RestaurantReservationResponseDto } from './restaurant-reservation-response.dto';

describe('RestaurantReservationResponseDto', () => {
  it('maps enriched reservation tables without losing legacy tableIds', () => {
    const dto = RestaurantReservationResponseDto.fromDomain({
      id: 'reservation-1',
      customerId: 'customer-1',
      customerNameSnapshot: 'Laura Gomez',
      customerPhoneSnapshot: '+34 600 111 222',
      partySize: 4,
      reservationAt: '2026-06-27T13:30:00.000Z',
      durationMinutes: 90,
      status: 'confirmed',
      notes: 'Mesa tranquila.',
      tableIds: ['table-1', 'table-4'],
      tables: [
        { id: 'table-1', tableNumber: 1, name: 'Mesa 1' },
        { id: 'table-4', tableNumber: 4, name: 'Mesa 4' },
      ],
    });

    expect(dto.tableIds).toEqual(['table-1', 'table-4']);
    expect(dto.tables).toEqual([
      { id: 'table-1', tableNumber: 1, name: 'Mesa 1' },
      { id: 'table-4', tableNumber: 4, name: 'Mesa 4' },
    ]);
  });
});
