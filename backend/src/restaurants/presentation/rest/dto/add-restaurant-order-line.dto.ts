import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class OrderLineModifierDto {
  @ApiProperty() @IsString() @IsNotEmpty() modifierGroupId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() modifierOptionId!: string;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) quantity!: number;
}

export class OrderLineComboSlotDto {
  @ApiProperty() @IsString() @IsNotEmpty() comboSlotId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() restaurantProductId!: string;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) quantity!: number;
}

export class OrderLinePlatterComponentDto {
  @ApiProperty() @IsString() @IsNotEmpty() platterComponentId!: string;
  @ApiProperty() @IsBoolean() included!: boolean;
}

export class AddRestaurantOrderLineDto {
  @ApiProperty() @IsString() @IsNotEmpty() restaurantProductId!: string;

  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) quantity!: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  kitchenNote?: string | null;

  @ApiPropertyOptional({ type: () => OrderLineModifierDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineModifierDto)
  modifiers?: OrderLineModifierDto[];

  @ApiPropertyOptional({ type: () => OrderLineComboSlotDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineComboSlotDto)
  comboSlots?: OrderLineComboSlotDto[];

  @ApiPropertyOptional({ type: () => OrderLinePlatterComponentDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLinePlatterComponentDto)
  platterComponents?: OrderLinePlatterComponentDto[];
}
