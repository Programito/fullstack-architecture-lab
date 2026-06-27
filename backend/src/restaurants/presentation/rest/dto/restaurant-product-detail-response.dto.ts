import { ApiProperty } from '@nestjs/swagger';

import type { RestaurantProductDetail } from '../../../domain/restaurant-read.models';

export class RestaurantProductDetailResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() productId: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) displayName: string | null;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty({ nullable: true }) displayDescription: string | null;
  @ApiProperty({ enum: ['simple', 'combo', 'platter'] }) productType: string;
  @ApiProperty({ enum: ['drinks', 'starter', 'main', 'dessert', 'other'] }) course: string;
  @ApiProperty({ enum: ['direct', 'bar', 'kitchen', 'cold_station', 'dessert_station'] }) preparationRoute: string;
  @ApiProperty({ nullable: true }) preparationRouteOverride: string | null;
  @ApiProperty() priceCents: number;
  @ApiProperty() currency: string;
  @ApiProperty() isAvailable: boolean;
  @ApiProperty() isVisible: boolean;

  static from(detail: RestaurantProductDetail): RestaurantProductDetailResponseDto {
    return {
      id: detail.id,
      productId: detail.productId,
      organizationId: detail.organizationId,
      name: detail.name,
      displayName: detail.displayName,
      description: detail.description,
      displayDescription: detail.displayDescription,
      productType: detail.productType,
      course: detail.course,
      preparationRoute: detail.preparationRoute,
      preparationRouteOverride: detail.preparationRouteOverride,
      priceCents: detail.priceCents,
      currency: detail.currency,
      isAvailable: detail.isAvailable,
      isVisible: detail.isVisible,
    };
  }
}
