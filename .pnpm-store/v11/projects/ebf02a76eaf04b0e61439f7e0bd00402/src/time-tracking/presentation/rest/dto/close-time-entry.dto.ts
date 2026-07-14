import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class CloseTimeEntryDto {
  @ApiProperty({ example: '2026-07-07T16:00:00.000Z' })
  @IsISO8601()
  clockOutAt!: string;

  @ApiPropertyOptional({ example: 'Cierre correcto', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  clockOutNote?: string | null;
}
