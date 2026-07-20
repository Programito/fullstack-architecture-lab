import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class SendRestaurantServicePointToKitchenDto {
  @ApiPropertyOptional({ type: [String], description: 'Specific pending order line ids to send to kitchen.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lineIds?: string[];
}
