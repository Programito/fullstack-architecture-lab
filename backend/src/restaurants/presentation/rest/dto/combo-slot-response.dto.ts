import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { NameI18n } from '../../../domain/restaurant-read.models';
import type { ComboSlotEntity, ComboSlotOptionEntity } from '../../../application/ports/combo-slot-repository.port';

export class ComboSlotOptionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() restaurantProductId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() supplementPriceCents!: number;
  @ApiProperty() isDefault!: boolean;
  @ApiProperty() isAvailable!: boolean;
  @ApiProperty() sortOrder!: number;

  static from(option: ComboSlotOptionEntity): ComboSlotOptionResponseDto {
    const dto = new ComboSlotOptionResponseDto();
    dto.id = option.id;
    dto.restaurantProductId = option.restaurantProductId;
    dto.name = option.name;
    dto.supplementPriceCents = option.supplementPriceCents;
    dto.isDefault = option.isDefault;
    dto.isAvailable = option.isAvailable;
    dto.sortOrder = option.sortOrder;
    return dto;
  }
}

export class ComboSlotResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() comboDefinitionId!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() nameI18n?: NameI18n;
  @ApiProperty() minSelections!: number;
  @ApiProperty() maxSelections!: number;
  @ApiProperty() isRequired!: boolean;
  @ApiProperty() sortOrder!: number;
  @ApiProperty({ type: [ComboSlotOptionResponseDto] }) options!: ComboSlotOptionResponseDto[];

  static from(entity: ComboSlotEntity): ComboSlotResponseDto {
    const dto = new ComboSlotResponseDto();
    dto.id = entity.id;
    dto.comboDefinitionId = entity.comboDefinitionId;
    dto.name = entity.name;
    dto.nameI18n = entity.nameI18n;
    dto.minSelections = entity.minSelections;
    dto.maxSelections = entity.maxSelections;
    dto.isRequired = entity.isRequired;
    dto.sortOrder = entity.sortOrder;
    dto.options = entity.options.map(ComboSlotOptionResponseDto.from);
    return dto;
  }
}
