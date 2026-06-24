import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class UpdateRestaurantFloorDto {
  @ApiProperty({ example: 'Sala principal renovada' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 14 })
  @IsInt()
  @Min(1)
  rows!: number;

  @ApiProperty({ example: 18 })
  @IsInt()
  @Min(1)
  columns!: number;
}
