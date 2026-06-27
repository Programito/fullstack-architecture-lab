import { ApiProperty } from '@nestjs/swagger';

export class MenuSectionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() menuId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() isVisible!: boolean;
}
