import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class DeveloperLogsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ enum: ['info', 'warn', 'error'] })
  @IsOptional()
  @IsIn(['info', 'warn', 'error'])
  level?: 'info' | 'warn' | 'error';

  @ApiPropertyOptional({ enum: ['request', 'error', 'audit', 'client'] })
  @IsOptional()
  @IsIn(['request', 'error', 'audit', 'client'])
  category?: 'request' | 'error' | 'audit' | 'client';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actorUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  restaurantId?: string;

  @ApiPropertyOptional({ enum: ['attempted', 'succeeded', 'failed'] })
  @IsOptional()
  @IsIn(['attempted', 'succeeded', 'failed'])
  result?: 'attempted' | 'succeeded' | 'failed';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}
