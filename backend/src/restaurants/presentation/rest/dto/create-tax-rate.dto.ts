import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaxRateDto {
  @ApiProperty({ example: 'IVA Reducido' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 10, description: 'Porcentaje de IVA (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  ratePercent: number;
}

export class UpdateTaxRateDto {
  @ApiPropertyOptional({ example: 'IVA Reducido' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 10, description: 'Porcentaje de IVA (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  ratePercent?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
