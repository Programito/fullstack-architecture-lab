import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { NameI18n } from '../../../domain/restaurant-read.models';
import type { PlatterComponentEntity } from '../../../application/ports/platter-component-repository.port';

export class PlatterComponentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() platterDefinitionId!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() nameI18n?: NameI18n;
  @ApiPropertyOptional({ nullable: true }) componentProductId!: string | null;
  @ApiPropertyOptional({ nullable: true }) quantity!: number | null;
  @ApiProperty() isRemovable!: boolean;
  @ApiProperty() isReplaceable!: boolean;
  @ApiProperty() sortOrder!: number;

  static from(entity: PlatterComponentEntity): PlatterComponentResponseDto {
    const dto = new PlatterComponentResponseDto();
    dto.id = entity.id;
    dto.platterDefinitionId = entity.platterDefinitionId;
    dto.name = entity.name;
    dto.nameI18n = entity.nameI18n;
    dto.componentProductId = entity.componentProductId;
    dto.quantity = entity.quantity;
    dto.isRemovable = entity.isRemovable;
    dto.isReplaceable = entity.isReplaceable;
    dto.sortOrder = entity.sortOrder;
    return dto;
  }
}
