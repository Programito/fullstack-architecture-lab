import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { Allergen } from '../../../domain/restaurant-read.models';
import { NameI18nDto } from './name-i18n.dto';

const ALLERGENS = [
  'gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans', 'milk',
  'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs',
] as const;

export class CreateRestaurantProductDto {
  @ApiProperty({ example: 'Hamburguesa craft' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ type: NameI18nDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NameI18nDto)
  nameI18n?: NameI18nDto;

  @ApiPropertyOptional({ example: 'Con cheddar madurado y bacon crujiente' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: NameI18nDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NameI18nDto)
  descriptionI18n?: NameI18nDto;

  @ApiProperty({ example: 1290, description: 'Price in cents' })
  @IsInt()
  @Min(0)
  priceCents: number;

  @ApiProperty({ example: 'EUR' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ enum: ['drinks', 'starter', 'main', 'dessert', 'other'], example: 'main' })
  @IsEnum(['drinks', 'starter', 'main', 'dessert', 'other'])
  course: 'drinks' | 'starter' | 'main' | 'dessert' | 'other';

  @ApiProperty({ enum: ['direct', 'bar', 'kitchen', 'cold_station', 'dessert_station'], example: 'kitchen' })
  @IsEnum(['direct', 'bar', 'kitchen', 'cold_station', 'dessert_station'])
  preparationRoute: 'direct' | 'bar' | 'kitchen' | 'cold_station' | 'dessert_station';

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

  @ApiPropertyOptional({ example: 'tax-1', description: 'Id del tipo de IVA (TaxRate) a asignar al producto' })
  @IsString()
  @IsOptional()
  taxRateId?: string | null;
}
