import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRestaurantProductDto {
  @ApiPropertyOptional({ example: 'Hamburguesa craft premium' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Con cheddar madurado y bacon crujiente', nullable: true })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({ example: 1490, description: 'Price in cents' })
  @IsInt()
  @Min(0)
  @IsOptional()
  priceCents?: number;

  @ApiPropertyOptional({ enum: ['drinks', 'starter', 'main', 'dessert', 'other'] })
  @IsEnum(['drinks', 'starter', 'main', 'dessert', 'other'])
  @IsOptional()
  course?: 'drinks' | 'starter' | 'main' | 'dessert' | 'other';

  @ApiPropertyOptional({ enum: ['direct', 'bar', 'kitchen', 'cold_station', 'dessert_station'] })
  @IsEnum(['direct', 'bar', 'kitchen', 'cold_station', 'dessert_station'])
  @IsOptional()
  preparationRoute?: 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station';

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;
}
