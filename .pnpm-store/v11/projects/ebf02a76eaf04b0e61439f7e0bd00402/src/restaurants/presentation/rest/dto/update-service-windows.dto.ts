import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsString, Matches, ValidateNested } from 'class-validator';

class ServiceWindowItemDto {
  @ApiProperty({ example: 'Comidas' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Start time in HH:MM format.', example: '12:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:MM (00:00–23:59)' })
  startTime!: string;

  @ApiProperty({ description: 'End time in HH:MM format.', example: '16:30' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be HH:MM (00:00–23:59)' })
  endTime!: string;
}

export class UpdateServiceWindowsDto {
  @ApiProperty({ type: [ServiceWindowItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceWindowItemDto)
  windows!: ServiceWindowItemDto[];
}
