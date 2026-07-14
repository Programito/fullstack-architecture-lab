import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancelRestaurantOrderLineDto {
  @ApiProperty({ description: 'Reason for cancellation. Required.' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
