import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { TimeEntryChangeRequestView } from '../../../domain/time-tracking.models';
import { TimeEntryResponseDto } from './time-entry-response.dto';

export class TimeEntryChangeRequestResponseDto {
  @ApiProperty({ example: 'change-1' })
  id!: string;

  @ApiProperty({ example: 'restaurant-1' })
  restaurantId!: string;

  @ApiProperty({ enum: ['pending', 'approved', 'rejected'], example: 'pending' })
  status!: TimeEntryChangeRequestView['status'];

  @ApiProperty({ example: 'Entre cinco minutos antes.' })
  reason!: string;

  @ApiPropertyOptional({ example: 'Validado', nullable: true })
  reviewNote!: string | null;

  @ApiPropertyOptional({ example: '2026-07-07T16:10:00.000Z', nullable: true })
  reviewedAt!: string | null;

  @ApiPropertyOptional({ example: '2026-07-07T07:55:00.000Z', nullable: true })
  requestedClockInAt!: string | null;

  @ApiPropertyOptional({ example: '2026-07-07T16:05:00.000Z', nullable: true })
  requestedClockOutAt!: string | null;

  @ApiPropertyOptional({ example: 'Apertura real', nullable: true })
  requestedClockInNote!: string | null;

  @ApiPropertyOptional({ example: 'Salida real', nullable: true })
  requestedClockOutNote!: string | null;

  @ApiProperty({ example: '2026-07-07T16:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-07-07T16:10:00.000Z' })
  updatedAt!: string;

  @ApiProperty({ type: TimeEntryResponseDto })
  timeEntry!: TimeEntryResponseDto;

  @ApiProperty({
    example: { id: 'user-1', firstName: 'Laura', lastName: 'Gomez', email: 'laura@example.com' },
  })
  requestedByUser!: TimeEntryChangeRequestView['requestedByUser'];

  @ApiPropertyOptional({
    example: { id: 'user-2', firstName: 'Mario', lastName: 'Soler', email: 'mario@example.com' },
    nullable: true,
  })
  reviewedByUser!: TimeEntryChangeRequestView['reviewedByUser'];

  static fromDomain(view: TimeEntryChangeRequestView): TimeEntryChangeRequestResponseDto {
    return {
      id: view.id,
      restaurantId: view.restaurantId,
      status: view.status,
      reason: view.reason,
      reviewNote: view.reviewNote,
      reviewedAt: view.reviewedAt,
      requestedClockInAt: view.requestedClockInAt,
      requestedClockOutAt: view.requestedClockOutAt,
      requestedClockInNote: view.requestedClockInNote,
      requestedClockOutNote: view.requestedClockOutNote,
      createdAt: view.createdAt,
      updatedAt: view.updatedAt,
      timeEntry: TimeEntryResponseDto.fromDomain(view.timeEntry),
      requestedByUser: { ...view.requestedByUser },
      reviewedByUser: view.reviewedByUser ? { ...view.reviewedByUser } : null,
    };
  }
}
