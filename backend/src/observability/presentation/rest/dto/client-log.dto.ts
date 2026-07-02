import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class ClientLogDto {
  @ApiProperty({ enum: ['info', 'warn', 'error'] })
  @IsIn(['info', 'warn', 'error'])
  level!: 'info' | 'warn' | 'error';

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  event!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  message!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  path?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
