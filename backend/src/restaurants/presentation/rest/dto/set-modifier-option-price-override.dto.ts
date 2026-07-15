import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class SetModifierOptionPriceOverrideDto {
  @ApiProperty({ example: 200, description: 'Price delta in cents, specific to this product (overrides the modifier option default)' })
  @IsInt()
  @Min(0)
  priceDeltaCents: number;
}
