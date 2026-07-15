import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { ModifierOptionForProductEntity } from '../../../application/ports/modifier-option-override-repository.port';

export class ModifierOptionOverrideResponseDto {
  @ApiProperty() modifierOptionId!: string;
  @ApiProperty() modifierOptionName!: string;
  @ApiProperty() modifierGroupId!: string;
  @ApiProperty() modifierGroupName!: string;
  @ApiProperty() defaultPriceDeltaCents!: number;
  @ApiPropertyOptional({ nullable: true }) overridePriceDeltaCents!: number | null;
  @ApiProperty() effectivePriceDeltaCents!: number;
  @ApiProperty() isOverridden!: boolean;

  static from(entity: ModifierOptionForProductEntity): ModifierOptionOverrideResponseDto {
    const dto = new ModifierOptionOverrideResponseDto();
    dto.modifierOptionId = entity.modifierOptionId;
    dto.modifierOptionName = entity.modifierOptionName;
    dto.modifierGroupId = entity.modifierGroupId;
    dto.modifierGroupName = entity.modifierGroupName;
    dto.defaultPriceDeltaCents = entity.defaultPriceDeltaCents;
    dto.overridePriceDeltaCents = entity.overridePriceDeltaCents;
    dto.effectivePriceDeltaCents = entity.overridePriceDeltaCents ?? entity.defaultPriceDeltaCents;
    dto.isOverridden = entity.overridePriceDeltaCents !== null;
    return dto;
  }
}
