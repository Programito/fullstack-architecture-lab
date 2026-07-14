import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { NameI18nDto } from './name-i18n.dto';

export class UpdateMenuSectionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) name?: string;

  @ApiPropertyOptional({ type: NameI18nDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NameI18nDto)
  nameI18n?: NameI18nDto;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVisible?: boolean;
}
