import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

class ReorderFloorElementDto {
  @ApiProperty({ example: 'floor-element-1' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  x!: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  y!: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  width!: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  height!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  sortOrder!: number;
}

export class ReorderFloorElementsDto {
  @ApiProperty({ type: [ReorderFloorElementDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderFloorElementDto)
  elements!: ReorderFloorElementDto[];
}
