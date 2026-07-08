import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTimeEntryDto {
  @ApiProperty({ example: '2026-07-07T08:00:00.000Z' })
  @IsISO8601()
  clockInAt!: string;

  @ApiPropertyOptional({ example: 'Abro sala', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  clockInNote?: string | null;
}
