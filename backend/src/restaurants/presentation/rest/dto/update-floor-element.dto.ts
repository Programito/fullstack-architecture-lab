import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateFloorElementDto {
  @ApiProperty({ example: 'Bar' })
  @IsString()
  @MinLength(1)
  label!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  x!: number;

  @ApiProperty({ example: 7 })
  @IsInt()
  @Min(0)
  y!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  width!: number;

  @ApiProperty({ example: 6 })
  @IsInt()
  @Min(1)
  height!: number;

  @ApiPropertyOptional({ enum: ['round', 'square', 'rectangle', 'long'], nullable: true })
  @IsOptional()
  @IsIn(['round', 'square', 'rectangle', 'long'])
  shape?: 'round' | 'square' | 'rectangle' | 'long' | null;

  @ApiPropertyOptional({ example: 6, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number | null;
}
