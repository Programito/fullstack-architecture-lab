import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { NameI18n } from '../../../domain/restaurant-read.models';
import { NameI18nDto } from './name-i18n.dto';

export class MenuSectionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() menuId!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ type: NameI18nDto }) nameI18n?: NameI18n;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() isVisible!: boolean;
}
