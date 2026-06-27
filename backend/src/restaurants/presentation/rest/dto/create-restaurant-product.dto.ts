import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRestaurantProductDto {
  @ApiProperty({ example: 'Hamburguesa craft' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Con cheddar madurado y bacon crujiente' })
  @IsString()
  @IsOptional()
  description?: string;

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
}
