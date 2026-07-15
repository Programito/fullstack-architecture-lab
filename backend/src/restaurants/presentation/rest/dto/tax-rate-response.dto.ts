import { ApiProperty } from '@nestjs/swagger';

import type { TaxRateEntity } from '../../../application/ports/tax-rate-repository.port';

export class TaxRateResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() ratePercent!: number;
  @ApiProperty() isActive!: boolean;

  static from(entity: TaxRateEntity): TaxRateResponseDto {
    const dto = new TaxRateResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.ratePercent = entity.ratePercent;
    dto.isActive = entity.isActive;
    return dto;
  }
}
