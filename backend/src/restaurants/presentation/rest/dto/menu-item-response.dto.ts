import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MenuItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() sectionId!: string;
  @ApiProperty() restaurantProductId!: string;
  @ApiPropertyOptional({ nullable: true }) displayNameOverride!: string | null;
  @ApiPropertyOptional({ nullable: true }) priceOverrideCents!: number | null;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() isVisible!: boolean;
}
