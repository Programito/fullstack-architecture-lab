import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { RestaurantReservation } from '../../../domain/restaurant-read.models';

export class RestaurantReservationResponseDto {
  @ApiProperty({ example: [{ id: 'table-1', tableNumber: 1, name: 'Mesa 1' }] })
  tables!: Array<{ id: string; tableNumber: number; name: string | null }>;

  @ApiProperty({ example: 'reservation-demo-lunch' })
  id!: string;

  @ApiPropertyOptional({ example: 'customer-laura', nullable: true })
  customerId!: string | null;

  @ApiProperty({ example: 'Laura Gomez' })
  customerNameSnapshot!: string;

  @ApiPropertyOptional({ example: '+34 600 111 222', nullable: true })
  customerPhoneSnapshot!: string | null;

  @ApiProperty({ example: 2 })
  partySize!: number;

  @ApiProperty({ example: '2026-06-21T13:30:00.000Z' })
  reservationAt!: string;

  @ApiProperty({ example: 90 })
  durationMinutes!: number;

  @ApiProperty({ enum: ['pending', 'confirmed', 'seated', 'cancelled', 'no_show'], example: 'confirmed' })
  status!: RestaurantReservation['status'];

  @ApiPropertyOptional({ example: 'Mesa tranquila.', nullable: true })
  notes!: string | null;

  @ApiProperty({ type: [String], example: ['table-1'] })
  tableIds!: string[];

  static fromDomain(reservation: RestaurantReservation): RestaurantReservationResponseDto {
    return {
      ...reservation,
      tableIds: [...reservation.tableIds],
      tables: reservation.tables.map((table) => ({ ...table })),
    };
  }
}
