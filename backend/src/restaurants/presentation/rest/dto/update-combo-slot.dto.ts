import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { NameI18nDto } from './name-i18n.dto';
import { CreateComboSlotOptionDto } from './create-combo-slot.dto';

export class UpdateComboSlotDto {
  @ApiPropertyOptional({ example: 'Hamburguesa' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ type: NameI18nDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NameI18nDto)
  nameI18n?: NameI18nDto;

  @ApiPropertyOptional({ example: 1, description: 'Minimum number of selections in this slot' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minSelections?: number;

  @ApiPropertyOptional({ example: 1, description: 'Maximum number of selections in this slot' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxSelections?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({
    type: [CreateComboSlotOptionDto],
    description: 'If provided, replaces the full set of options for this slot.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateComboSlotOptionDto)
  options?: CreateComboSlotOptionDto[];
}
