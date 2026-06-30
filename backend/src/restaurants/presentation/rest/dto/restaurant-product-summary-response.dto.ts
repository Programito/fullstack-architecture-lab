import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { RestaurantProductSummary } from '../../../domain/restaurant-read.models';

export class RestaurantProductSummaryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() productId!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) displayName!: string | null;
  @ApiPropertyOptional({ nullable: true }) imageUrl!: string | null;
  @ApiProperty({ type: [String] }) modifierGroupIds!: string[];
  @ApiProperty({ enum: ['simple', 'combo', 'platter'] }) productType!: string;
  @ApiProperty({ enum: ['drinks', 'starter', 'main', 'dessert', 'other'] }) course!: string;
  @ApiProperty({ enum: ['direct', 'bar', 'kitchen', 'cold_station', 'dessert_station'] }) preparationRoute!: string;
  @ApiProperty() priceCents!: number;
  @ApiProperty() currency!: string;
  @ApiProperty() isAvailable!: boolean;
  @ApiProperty() isVisible!: boolean;

  static from(domain: RestaurantProductSummary): RestaurantProductSummaryResponseDto {
    const dto = new RestaurantProductSummaryResponseDto();
    dto.id = domain.id;
    dto.productId = domain.productId;
    dto.name = domain.name;
    dto.displayName = domain.displayName;
    dto.imageUrl = domain.imageUrl;
    dto.modifierGroupIds = domain.modifierGroupIds;
    dto.productType = domain.productType;
    dto.course = domain.course;
    dto.preparationRoute = domain.preparationRoute;
    dto.priceCents = domain.priceCents;
    dto.currency = domain.currency;
    dto.isAvailable = domain.isAvailable;
    dto.isVisible = domain.isVisible;
    return dto;
  }
}
