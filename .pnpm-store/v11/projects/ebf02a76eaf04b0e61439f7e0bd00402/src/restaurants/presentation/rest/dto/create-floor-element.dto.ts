import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateFloorElementDto {
  @ApiProperty({ enum: ['table', 'bar', 'kitchen', 'bathroom', 'entrance', 'blocked', 'stool'], example: 'blocked' })
  @IsIn(['table', 'bar', 'kitchen', 'bathroom', 'entrance', 'blocked', 'stool'])
  type!: 'table' | 'bar' | 'kitchen' | 'bathroom' | 'entrance' | 'blocked' | 'stool';

  @ApiProperty({ example: 'Zona temporal' })
  @IsString()
  @MinLength(1)
  label!: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  x!: number;

  @ApiProperty({ example: 9 })
  @IsInt()
  @Min(0)
  y!: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  width!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  height!: number;

  @ApiPropertyOptional({ example: null, nullable: true })
  @IsOptional()
  @IsString()
  tableId?: string | null;

  @ApiPropertyOptional({ enum: ['round', 'square', 'rectangle', 'long'], nullable: true })
  @IsOptional()
  @IsIn(['round', 'square', 'rectangle', 'long'])
  shape?: 'round' | 'square' | 'rectangle' | 'long' | null;

  @ApiProperty({ example: 8 })
  @IsInt()
  @Min(1)
  sortOrder!: number;
}
