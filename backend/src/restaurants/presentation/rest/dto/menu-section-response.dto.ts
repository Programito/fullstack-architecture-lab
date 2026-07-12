import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { NameI18n } from '../../../domain/restaurant-read.models';

export class MenuSectionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() menuId!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() nameI18n?: NameI18n;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() isVisible!: boolean;
}
