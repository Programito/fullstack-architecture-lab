import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

class SortOrderItemDto {
  @ApiProperty() @IsString() id!: string;
  @ApiProperty() @IsInt() @Min(0) sortOrder!: number;
}

export class ReorderMenuItemsDto {
  @ApiProperty({ type: [SortOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SortOrderItemDto)
  items!: SortOrderItemDto[];
}
