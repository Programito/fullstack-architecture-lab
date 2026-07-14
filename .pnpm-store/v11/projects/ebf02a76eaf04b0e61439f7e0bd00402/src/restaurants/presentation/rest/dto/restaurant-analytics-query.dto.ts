import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class RestaurantAnalyticsQueryDto {
  @ApiProperty()
  @IsDateString()
  from!: string;

  @ApiProperty()
  @IsDateString()
  to!: string;
}
