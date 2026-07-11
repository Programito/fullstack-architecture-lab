import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { NameI18n, RestaurantProductDetail } from '../../../domain/restaurant-read.models';
import { NameI18nDto } from './name-i18n.dto';

export class RestaurantProductDetailResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() productId: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ type: NameI18nDto }) nameI18n?: NameI18n;
  @ApiProperty({ nullable: true }) displayName: string | null;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty({ nullable: true }) displayDescription: string | null;
  @ApiProperty({ nullable: true }) imageUrl: string | null;
  @ApiProperty({ type: [String] }) modifierGroupIds: string[];
  @ApiProperty({ enum: ['simple', 'combo', 'platter'] }) productType: string;
  @ApiProperty({ enum: ['drinks', 'starter', 'main', 'dessert', 'other'] }) course: string;
  @ApiProperty({ enum: ['direct', 'bar', 'kitchen', 'cold_station', 'dessert_station'] }) preparationRoute: string;
  @ApiProperty({ nullable: true }) preparationRouteOverride: string | null;
  @ApiProperty({ type: [String] }) allergens: string[];
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
      nameI18n: detail.nameI18n,
      displayName: detail.displayName,
      description: detail.description,
      displayDescription: detail.displayDescription,
      imageUrl: detail.imageUrl,
      modifierGroupIds: detail.modifierGroupIds,
      productType: detail.productType,
      course: detail.course,
      preparationRoute: detail.preparationRoute,
      preparationRouteOverride: detail.preparationRouteOverride,
      allergens: detail.allergens,
      priceCents: detail.priceCents,
      currency: detail.currency,
      isAvailable: detail.isAvailable,
      isVisible: detail.isVisible,
    };
  }
}
