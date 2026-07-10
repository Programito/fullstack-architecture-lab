import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class CreateModifierOptionDto {
  @ApiProperty({ example: 'Queso extra' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 50, description: 'Price delta in cents (can be 0)' })
  @IsInt()
  @Min(0)
  priceDeltaCents: number;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/demo/image/upload/v1/restaurants/r-1/modifier-options/queso-extra.jpg',
    description: 'Optional thumbnail image for the option. Not required.',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class CreateModifierGroupDto {
  @ApiProperty({ example: 'Extras de hamburguesa' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ['single', 'multiple'], example: 'multiple' })
  @IsEnum(['single', 'multiple'])
  selectionType: 'single' | 'multiple';

  @ApiProperty({ example: 0, description: 'Minimum number of selections' })
  @IsInt()
  @Min(0)
  minSelections: number;

  @ApiProperty({ example: 3, description: 'Maximum number of selections' })
  @IsInt()
  @Min(1)
  maxSelections: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ type: [CreateModifierOptionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateModifierOptionDto)
  options: CreateModifierOptionDto[];

  @ApiPropertyOptional({
    enum: ['shared', 'product'],
    default: 'shared',
    description: 'shared = catálogo compartido (Modificadores); product = suplemento privado de un producto',
  })
  @IsOptional()
  @IsEnum(['shared', 'product'])
  scope?: 'shared' | 'product';

  @ApiPropertyOptional({ description: 'Id del RestaurantProduct dueño, obligatorio cuando scope=product' })
  @IsOptional()
  @IsString()
  ownerRestaurantProductId?: string;
}

export class UpdateModifierGroupDto {
  @ApiProperty({ example: 'Extras de hamburguesa' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ['single', 'multiple'], example: 'multiple' })
  @IsEnum(['single', 'multiple'])
  selectionType: 'single' | 'multiple';

  @ApiProperty({ example: 0, description: 'Minimum number of selections' })
  @IsInt()
  @Min(0)
  minSelections: number;

  @ApiProperty({ example: 3, description: 'Maximum number of selections' })
  @IsInt()
  @Min(1)
  maxSelections: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ type: [CreateModifierOptionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateModifierOptionDto)
  options: CreateModifierOptionDto[];
}
