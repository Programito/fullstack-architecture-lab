import { ApiProperty } from '@nestjs/swagger';

import type { ModifierGroupEntity, ModifierGroupOptionEntity } from '../../../application/ports/modifier-group-repository.port';

export class ModifierGroupOptionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() priceDeltaCents!: number;
  @ApiProperty() isAvailable!: boolean;

  static from(option: ModifierGroupOptionEntity): ModifierGroupOptionResponseDto {
    const dto = new ModifierGroupOptionResponseDto();
    dto.id = option.id;
    dto.name = option.name;
    dto.priceDeltaCents = option.priceDeltaCents;
    dto.isAvailable = option.isAvailable;
    return dto;
  }
}

export class ModifierGroupResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ['single', 'multiple'] }) selectionType!: string;
  @ApiProperty() minSelections!: number;
  @ApiProperty() maxSelections!: number;
  @ApiProperty() isRequired!: boolean;
  @ApiProperty({ type: [ModifierGroupOptionResponseDto] }) options!: ModifierGroupOptionResponseDto[];

  static from(entity: ModifierGroupEntity): ModifierGroupResponseDto {
    const dto = new ModifierGroupResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.selectionType = entity.selectionType;
    dto.minSelections = entity.minSelections;
    dto.maxSelections = entity.maxSelections;
    dto.isRequired = entity.isRequired;
    dto.options = entity.options.map(ModifierGroupOptionResponseDto.from);
    return dto;
  }
}
