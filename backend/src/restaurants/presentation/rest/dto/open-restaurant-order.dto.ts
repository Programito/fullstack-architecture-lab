import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class OpenRestaurantOrderDto {
  @ApiPropertyOptional({ description: 'Number of guests at the table.', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  guestCount?: number;
}
