import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// Variantes de nombre por idioma (ES/CA/EN), todas opcionales. `name` sigue
// siendo obligatorio y canonico en el DTO que contiene este campo; aqui solo
// viajan las traducciones que existan. Ver
// docs/superpowers/plans/2026-07-11-menu-multilingual-names.md.
export class NameI18nDto {
  @ApiPropertyOptional({ example: 'Hamburguesa craft' })
  @IsOptional()
  @IsString()
  es?: string;

  @ApiPropertyOptional({ example: 'Hamburguesa craft' })
  @IsOptional()
  @IsString()
  ca?: string;

  @ApiPropertyOptional({ example: 'Craft burger' })
  @IsOptional()
  @IsString()
  en?: string;
}
