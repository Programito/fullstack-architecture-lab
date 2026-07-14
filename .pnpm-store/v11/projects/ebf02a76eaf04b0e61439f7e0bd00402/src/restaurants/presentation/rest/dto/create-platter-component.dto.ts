import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { NameI18nDto } from './name-i18n.dto';

export class CreatePlatterComponentDto {
  @ApiProperty({ example: 'Patatas fritas' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ type: NameI18nDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NameI18nDto)
  nameI18n?: NameI18nDto;

  @ApiPropertyOptional({
    example: 'product-patatas-fritas',
    nullable: true,
    description: 'Optional Product id (organization catalog) this component can be swapped for/tracked against.',
  })
  @IsOptional()
  @IsString()
  componentProductId?: string | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number | null;

  @ApiProperty({ example: true })
  @IsBoolean()
  isRemovable: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  isReplaceable: boolean;
}
