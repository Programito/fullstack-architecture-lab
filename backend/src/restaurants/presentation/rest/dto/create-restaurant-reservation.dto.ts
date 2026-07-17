import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

import type { PaymentMethod } from '../../../domain/restaurant-order.models';

export class CreateRestaurantReservationDto {
  @ApiProperty({ description: 'Customer name snapshot.', example: 'Laura Gomez' })
  @IsString()
  customerNameSnapshot!: string;

  @ApiPropertyOptional({ description: 'Customer phone snapshot.', example: '+34 600 111 222' })
  @IsOptional()
  @IsString()
  customerPhoneSnapshot?: string | null;

  @ApiProperty({ description: 'Party size.', example: 2 })
  @IsInt()
  @Min(1)
  partySize!: number;

  @ApiProperty({ description: 'Reservation datetime in ISO-8601 format.', example: '2026-06-28T13:30:00.000Z' })
  @IsDateString()
  reservationAt!: string;

  @ApiPropertyOptional({ description: 'Reservation duration in minutes.', example: 90 })
  @IsOptional()
  @IsInt()
  @Min(15)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Operational notes.', example: 'Ventana' })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({ description: 'Optional restaurant table ids.', example: ['table-1'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tableIds?: string[];

  @ApiProperty({
    description: 'Payment method used to charge the (fake) reservation deposit. No real payment gateway is involved.',
    enum: ['cash', 'card', 'bizum', 'other'],
    example: 'card',
    required: false,
  })
  @IsOptional()
  @IsIn(['cash', 'card', 'bizum', 'other'])
  paymentMethod?: PaymentMethod;
}
