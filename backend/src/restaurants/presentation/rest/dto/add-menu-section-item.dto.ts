import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class AddMenuSectionItemDto {
  @ApiProperty() @IsString() @MinLength(1) restaurantProductId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) displayNameOverride?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) priceOverrideCents?: number;
}
