import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EntityOptionsQueryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  restaurantId?: string;
}
