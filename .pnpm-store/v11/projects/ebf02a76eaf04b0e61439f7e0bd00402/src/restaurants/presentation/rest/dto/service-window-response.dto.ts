import { ApiProperty } from '@nestjs/swagger';

import type { ServiceWindow } from '../../../domain/restaurant-read.models';

export class ServiceWindowResponseDto {
  @ApiProperty({ example: 'sw-lunch' })
  id!: string;

  @ApiProperty({ example: 'restaurant-mesaflow-centro' })
  restaurantId!: string;

  @ApiProperty({ example: 'Comidas' })
  name!: string;

  @ApiProperty({ example: '12:00' })
  startTime!: string;

  @ApiProperty({ example: '16:30' })
  endTime!: string;

  @ApiProperty({ example: 1 })
  sortOrder!: number;

  static fromDomain(window: ServiceWindow): ServiceWindowResponseDto {
    return { ...window };
  }
}
