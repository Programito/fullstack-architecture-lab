import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateProductImageUploadSignatureDto {
  @ApiPropertyOptional({ example: 'hamburguesa-craft.png' })
  @IsString()
  @IsOptional()
  fileName?: string;
}
