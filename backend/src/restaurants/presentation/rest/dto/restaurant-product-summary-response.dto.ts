import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RestaurantProductSummaryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() productId!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) displayName!: string | null;
  @ApiProperty({ enum: ['simple', 'combo', 'platter'] }) productType!: string;
  @ApiProperty() priceCents!: number;
  @ApiProperty() currency!: string;
  @ApiProperty() isAvailable!: boolean;
  @ApiProperty() isVisible!: boolean;
}
