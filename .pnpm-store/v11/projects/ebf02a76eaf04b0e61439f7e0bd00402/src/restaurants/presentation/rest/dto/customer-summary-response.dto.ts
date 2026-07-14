import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { CustomerSummary } from '../../../domain/restaurant-read.models';

export class CustomerSummaryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiProperty() visitCount!: number;
  @ApiProperty() noShowCount!: number;
  @ApiProperty() cancelCount!: number;
  @ApiProperty() lateCount!: number;

  static fromDomain(c: CustomerSummary): CustomerSummaryResponseDto {
    const dto = new CustomerSummaryResponseDto();
    dto.id = c.id;
    dto.name = c.name;
    dto.phone = c.phone;
    dto.email = c.email;
    dto.visitCount = c.visitCount;
    dto.noShowCount = c.noShowCount;
    dto.cancelCount = c.cancelCount;
    dto.lateCount = c.lateCount;
    return dto;
  }
}
