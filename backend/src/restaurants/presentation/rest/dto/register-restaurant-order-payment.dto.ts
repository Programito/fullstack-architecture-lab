import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Min } from 'class-validator';

import type { PaymentMethod } from '../../../domain/restaurant-order.models';

export class RegisterRestaurantOrderPaymentDto {
  @ApiProperty({ minimum: 1, description: 'Amount in cents (must be positive).' })
  @IsInt()
  @Min(1)
  amountCents!: number;

  @ApiProperty({ enum: ['cash', 'card', 'bizum', 'other'] })
  @IsIn(['cash', 'card', 'bizum', 'other'])
  method!: PaymentMethod;
}
