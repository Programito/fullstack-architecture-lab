import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateProductImageUploadSignatureDto {
  @ApiPropertyOptional({ example: 'hamburguesa-craft.png' })
  @IsString()
  @IsOptional()
  fileName?: string;

  @ApiPropertyOptional({
    enum: ['products', 'modifier-options'],
    default: 'products',
    description: 'Subcarpeta de Cloudinary donde se guarda la imagen (productos u opciones de modificador/suplementos).',
  })
  @IsEnum(['products', 'modifier-options'])
  @IsOptional()
  scope?: 'products' | 'modifier-options';
}
