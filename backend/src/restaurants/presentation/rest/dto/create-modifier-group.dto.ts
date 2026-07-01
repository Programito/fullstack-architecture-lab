import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateModifierOptionDto {
  @ApiProperty({ example: 'Queso extra' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 50, description: 'Price delta in cents (can be 0)' })
  @IsInt()
  @Min(0)
  priceDeltaCents: number;
}

export class CreateModifierGroupDto {
  @ApiProperty({ example: 'Extras de hamburguesa' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ['single', 'multiple'], example: 'multiple' })
  @IsEnum(['single', 'multiple'])
  selectionType: 'single' | 'multiple';

  @ApiProperty({ example: 0, description: 'Minimum number of selections' })
  @IsInt()
  @Min(0)
  minSelections: number;

  @ApiProperty({ example: 3, description: 'Maximum number of selections' })
  @IsInt()
  @Min(1)
  maxSelections: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ type: [CreateModifierOptionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateModifierOptionDto)
  options: CreateModifierOptionDto[];
}
