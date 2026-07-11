import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import type { Allergen } from '../../../domain/restaurant-read.models';
import { NameI18nDto } from './name-i18n.dto';

const ALLERGENS = [
  'gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans', 'milk',
  'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs',
] as const;

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

  @ApiPropertyOptional({
    type: NameI18nDto,
    description: 'Nombre traducido a catalán/inglés, opcional. El castellano de arriba sigue siendo el canónico.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NameI18nDto)
  nameI18n?: NameI18nDto;

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

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/demo/image/upload/v1/products/burger.jpg', nullable: true })
  @IsString()
  @IsOptional()
  imageUrl?: string | null;

  @ApiPropertyOptional({ type: [String], example: ['burger-extras', 'burger-point'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  modifierGroupIds?: string[];

  @ApiPropertyOptional({ type: [String], enum: ALLERGENS, example: ['gluten', 'milk'] })
  @IsArray()
  @IsEnum(ALLERGENS, { each: true })
  @IsOptional()
  allergens?: Allergen[];
}
