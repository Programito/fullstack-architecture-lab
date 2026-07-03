import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { RestaurantSummary } from '../../../domain/restaurant-read.models';

export class RestaurantSummaryResponseDto {
  @ApiProperty({ example: 'restaurant-mesaflow-centro' })
  id!: string;

  @ApiProperty({ example: 'org-demo' })
  organizationId!: string;

  @ApiProperty({ example: 'MesaFlow Centro' })
  name!: string;

  @ApiPropertyOptional({ example: 'MesaFlow Centro', nullable: true })
  displayName!: string | null;

  @ApiProperty({ example: 'Europe/Madrid' })
  timezone!: string;

  @ApiProperty({ example: 'EUR' })
  currency!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  static fromDomain(restaurant: RestaurantSummary): RestaurantSummaryResponseDto {
    return { ...restaurant };
  }
}
