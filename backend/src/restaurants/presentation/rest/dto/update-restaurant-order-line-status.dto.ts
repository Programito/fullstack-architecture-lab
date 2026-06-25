import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

import type { KitchenOrderLineStatus } from '../../../../restaurants/domain/restaurant-order.models';

export class UpdateRestaurantOrderLineStatusDto {
  @ApiProperty({ enum: ['preparing', 'ready', 'served'] })
  @IsIn(['preparing', 'ready', 'served'])
  status!: KitchenOrderLineStatus;
}
