import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTimeEntryChangeRequestDto {
  @ApiProperty({ example: 'entry-1' })
  @IsString()
  timeEntryId!: string;

  @ApiProperty({ example: 'Entre cinco minutos antes.' })
  @IsString()
  @MaxLength(1000)
  reason!: string;

  @ApiPropertyOptional({ example: '2026-07-07T07:55:00.000Z', nullable: true })
  @IsOptional()
  @IsISO8601()
  requestedClockInAt?: string | null;

  @ApiPropertyOptional({ example: '2026-07-07T16:05:00.000Z', nullable: true })
  @IsOptional()
  @IsISO8601()
  requestedClockOutAt?: string | null;

  @ApiPropertyOptional({ example: 'Apertura real', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  requestedClockInNote?: string | null;

  @ApiPropertyOptional({ example: 'Salida real', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  requestedClockOutNote?: string | null;
}
