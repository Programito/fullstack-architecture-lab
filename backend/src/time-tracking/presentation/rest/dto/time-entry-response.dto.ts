import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { TimeEntryView } from '../../../domain/time-tracking.models';

export class TimeEntryResponseDto {
  @ApiProperty({ example: 'entry-1' })
  id!: string;

  @ApiProperty({ example: 'user-1' })
  userId!: string;

  @ApiProperty({ example: 'restaurant-1' })
  restaurantId!: string;

  @ApiProperty({ example: '2026-07-07T08:00:00.000Z' })
  clockInAt!: string;

  @ApiPropertyOptional({ example: '2026-07-07T16:00:00.000Z', nullable: true })
  clockOutAt!: string | null;

  @ApiPropertyOptional({ example: 'Abro sala', nullable: true })
  clockInNote!: string | null;

  @ApiPropertyOptional({ example: 'Cierre correcto', nullable: true })
  clockOutNote!: string | null;

  @ApiProperty({ enum: ['open', 'closed', 'corrected'], example: 'closed' })
  status!: TimeEntryView['entry']['status'];

  @ApiProperty({ example: '2026-07-07T08:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-07-07T16:00:00.000Z' })
  updatedAt!: string;

  @ApiProperty({
    example: { id: 'user-1', firstName: 'Laura', lastName: 'Gomez', email: 'laura@example.com' },
  })
  user!: TimeEntryView['user'];

  static fromDomain(view: TimeEntryView): TimeEntryResponseDto {
    return {
      ...view.entry,
      user: { ...view.user },
    };
  }
}
