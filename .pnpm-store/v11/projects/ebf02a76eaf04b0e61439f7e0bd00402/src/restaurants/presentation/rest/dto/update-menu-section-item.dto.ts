import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateMenuSectionItemDto {
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MinLength(1) displayNameOverride?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsInt() @Min(0) priceOverrideCents?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isVisible?: boolean;
}
