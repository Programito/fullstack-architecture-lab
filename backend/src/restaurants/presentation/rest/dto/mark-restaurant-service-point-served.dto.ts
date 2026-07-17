import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class MarkRestaurantServicePointServedDto {
  @ApiPropertyOptional({ type: [String], description: 'Specific active order line ids to mark as served.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lineIds?: string[];
}
