import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetMenuItemAvailabilityDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  available!: boolean;
}
