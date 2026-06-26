import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

import type { KitchenOrderLineStatus } from '../../../../restaurants/domain/restaurant-order.models';

export class UpdateRestaurantOrderLineStatusDto {
  @ApiProperty({ enum: ['sent_to_kitchen', 'preparing', 'ready', 'served'] })
  @IsIn(['sent_to_kitchen', 'preparing', 'ready', 'served'])
  status!: KitchenOrderLineStatus;
}
