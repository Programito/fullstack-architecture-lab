import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { NameI18nDto } from './name-i18n.dto';

export class CreateComboSlotOptionDto {
  @ApiProperty({ example: 'rp-hamburguesa-clasica' })
  @IsString()
  @IsNotEmpty()
  restaurantProductId: string;

  @ApiProperty({ example: 0, description: 'Supplement price in cents (can be 0)' })
  @IsInt()
  @Min(0)
  supplementPriceCents: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateComboSlotDto {
  @ApiProperty({ example: 'Hamburguesa' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ type: NameI18nDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NameI18nDto)
  nameI18n?: NameI18nDto;

  @ApiProperty({ example: 1, description: 'Minimum number of selections in this slot' })
  @IsInt()
  @Min(0)
  minSelections: number;

  @ApiProperty({ example: 1, description: 'Maximum number of selections in this slot' })
  @IsInt()
  @Min(1)
  maxSelections: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ type: [CreateComboSlotOptionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateComboSlotOptionDto)
  options: CreateComboSlotOptionDto[];
}
